import math

scalingFactor = 0.5
depositFee = 0.1
target = 0.5

def proportion(basket, token, transaction):
	return (token + transaction)/(basket + transaction)

def deviation(basket, token, transaction, target):
	return proportion(basket, token, transaction) - target

def fee(scalingFactor, depositFee, basket, token, transaction, target):
	deviationToTarget = deviation(basket, token, transaction, target)
	deviationLogit = (deviationToTarget+target/2)/(deviationToTarget-target/2)
	normalMultiplier = math.log(deviationLogit, 10)
	return depositFee + (depositFee * scalingFactor * normalMultiplier)

token = 0.0
basket = 10.0
transaction = 90.0

proportion(basket, token, transaction)
0.9
deviation(basket, token, transaction, target)
0.4
fee(scalingFactor, depositFee, basket, token, transaction, target)
0.1318411048793587

token = 0.0
basket = 11.0
transaction = 89.0

proportion(basket, token, transaction)
0.89
deviation(basket, token, transaction, target)
0.39
fee(scalingFactor, depositFee, basket, token, transaction, target)
0.13300259691528246

token = 0.0
basket = 89.0
transaction = 11.0

proportion(basket, token, transaction)
0.11
deviation(basket, token, transaction, target)
-0.39
fee(scalingFactor, depositFee, basket, token, transaction, target)
0.06699740308471755

token = 0.0
basket = 90.0
transaction = 10.0

proportion(basket, token, transaction)
0.1
deviation(basket, token, transaction, target)
-0.4
fee(scalingFactor, depositFee, basket, token, transaction, target)
0.0681588951206413


