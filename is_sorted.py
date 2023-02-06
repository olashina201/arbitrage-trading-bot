def isSorted(lst):
    for i in range(len(lst) - 1):
        if lst[i] > lst[i + 1]:
            return False
    return True

print(isSorted([1,1,3,4,4,5,7,9,10,30,11]))