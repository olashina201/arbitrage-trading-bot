require('dotenv').config()

import { ethers } from 'ethers';
import { uniswapV3Price, uniswapV2Price, poolToDex, poolToRouter, colours, IUniswapV3PoolABI, IUniswapV2PairABI, CntrAbi } from './utils';
import { PriceLookup } from './interfaces';

// ============ Provider ============
const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC_PROVIDER as string);

let runCounter = 0;
let oppCounter = 0;
const runMath = async (buyAmount: number, priceList: PriceLookup[]) => {
    // Sort the prices
    priceList.sort((a, b) => b.token0_1 - a.token0_1);

    const tmpList = [];
    for (const [_, value] of Object.entries(priceList)) {
        tmpList.push({ Exchange: await poolToDex(value.pool), "In / Out": value.token0_1, "Out / In": value.token1_0, "PoolFee (%)": value.poolFee / 10000 })
    }
    console.table(tmpList);

    // Identify where to buy and sell
    const buyAt = priceList[0];
    const sellAt = priceList[priceList.length - 1];

    // ========================
    // xToken = TokenIn for BUY
    // yToken = TokenOut for BUY
    // ========================
    console.log(`${colours.FgBlue}============ Swaps ============`);
    console.log(`${colours.FgCyan}First Swap:\n - xToken: ${buyAmount} = yToken: ${buyAmount * buyAt.token0_1}`);
    console.log(`${colours.FgCyan}Second Swap:\n - yToken: ${buyAmount * buyAt.token0_1} = xToken: ${buyAmount * buyAt.token0_1 * sellAt.token1_0}`);

    console.log(`${colours.FgBlue}============ Profit ============`);
    var netProfit = (buyAmount * buyAt.token0_1 * sellAt.token1_0) - buyAmount;

    console.log(`${colours.FgRed}After Swaps: ${netProfit}`);
    
    // Flashloan premium
    netProfit -= buyAmount * 0.0009;
    console.log(`${colours.FgRed}After FL Premium: ${netProfit}`);
    
    // Padding
    if (parseFloat(process.env.PADDING as string) > 0) {
        netProfit -= netProfit * parseFloat(process.env.PADDING as string);
        console.log(`After: Padding: ${netProfit}`);
    }

    console.log(`${colours.FgBlue}========================\n${colours.FgGreen}Total: ${netProfit}${colours.Reset}\n`);

    // Return null if there is no profit
    if (netProfit <= 0) return null;

    oppCounter++;
    return {
        buy: {
            router: await poolToRouter(buyAt.pool),
            tokenIn: "",
            poolFee: buyAt.poolFee,
            isV3: buyAt.isV3,
        },
        sell: {
            router: await poolToRouter(sellAt.pool),
            tokenIn: "",
            poolFee: sellAt.poolFee,
            isV3: sellAt.isV3,
        }
    }
}

function poolContract(adr: string, abi: any) {
    return new ethers.Contract(adr, abi, provider)
}

let nonceOffset = 0;
async function getNonce(adr: string) {
    let baseNonce = await provider.getTransactionCount(adr);
    return baseNonce + (nonceOffset++);
}

async function main() {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
    const cntr = new ethers.Contract(process.env.CONTRACT_ADDRESS as string, CntrAbi, signer);

    // ============ USDC/wETH ============
    {
        console.log('USDC/wETH');
        // https://info.quickswap.exchange/#/pair/0x853ee4b2a13f8a742d64c8f088be7ba2131f670d
        const quickSwapData = await uniswapV2Price(poolContract('0x853ee4b2a13f8a742d64c8f088be7ba2131f670d', IUniswapV2PairABI), 3000);
        quickSwapData.token0_1 /= 10**12;
        quickSwapData.token1_0 *= 10**12;

        // ?
        const firebirdData = await uniswapV2Price(poolContract('0x853ee4b2a13f8a742d64c8f088be7ba2131f670d', IUniswapV2PairABI), 3000);
        firebirdData.token0_1 /= 10**12;
        firebirdData.token1_0 *= 10**12;

        const dat: any = await runMath(25000, [
            // https://info.uniswap.org/#/polygon/pools/0x45dda9cb7c25131df268515131f647d726f50608
            await uniswapV3Price(poolContract('0x45dda9cb7c25131df268515131f647d726f50608', IUniswapV3PoolABI), 6, 18, 500),
            // quickSwapData,
            firebirdData
        ]);
        if (dat != null) {
            dat.buy["tokenIn"] = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
            dat.sell["tokenIn"] = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';

            await cntr.functions.execute(dat, ethers.utils.parseUnits('25000', 6), { gasLimit: process.env.GAS_LIMIT, nonce: await getNonce(signer.address) }).catch(console.error);
        }
    }

    // ============ Exchange Addresses ============

    // ============ UniswapV2 ============
    // https://etherscan.io/address/0xa478c2975ab1ea89e8196811f51a7b7ade33eb11
    // ============ Croswap ============
    // https://etherscan.io/address/0x60a26d69263ef43e9a68964ba141263f19d71d51
    // ============ Sushiswap ============
    // https://etherscan.io/address/0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f
    // ============ Shebaswap ============
    // https://etherscan.io/address/0x8faf958e36c6970497386118030e6297fff8d275
    
    // ============ Token Addresses ============

    // ============ WETH ============
    // https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    // ============ DAI ============
    // https://etherscan.io/address/0x6b175474e89094c44da98b954eedeac495271d0f

    runCounter++;
    console.log(`(${runCounter}/${oppCounter}) Finished. Awaiting next call.`);
}

main();
setInterval(main, 1000 * parseInt(process.env.REQUEST_INTERVAL as string));