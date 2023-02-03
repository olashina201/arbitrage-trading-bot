def selection_sort_descending(arr):
    n = len(arr)
    for i in range(n-1, 0, -1):
        max_index = 0
        for j in range(1, i+1):
            if arr[j] > arr[max_index]:
                max_index = j
        arr[i], arr[max_index] = arr[max_index], arr[i]
    return arr

numbers = list(map(int, input("Enter a list of numbers separated by spaces: ").split()))

sorted_numbers = selection_sort_descending(numbers)

print("Sorted list in descending order:", sorted_numbers)
