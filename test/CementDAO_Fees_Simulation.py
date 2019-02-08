import math

scalingFactor = 0.5
depositFee = 0.1
target = 0.5

def proportion(_basket, _token, _transaction):
	return (_token + _transaction)/(_basket + _transaction)

def deviation(_proportion, _target):
	return _proportion - _target

def deviationLogit(_deviation, _target):
	return (_deviation+_target/2)/(_deviation-_target/2)

def normalMultiplier(_deviationLogit):
	return math.log(_deviationLogit, 10)

def fee(_depositFee, _scalingFactor, _normalMultiplier):
	return depositFee + (_depositFee * _scalingFactor * _normalMultiplier)

token = 0.0
basket = 90.0
transaction = 10.0

proportion(basket, token, transaction)

deviation(basket, token, transaction, target)

fee(scalingFactor, depositFee, basket, token, transaction, target)


_proportion = proportion(basket, token, transaction)
0.1
_deviation = deviation(_proportion, target)
-0.4
_deviationLogit = deviationLogit(_deviation, target)
0.23076923076923078
_normalMultiplier = normalMultiplier(_deviationLogit)
-0.6368220975871742
fee(depositFee, scalingFactor, _normalMultiplier)
0.0681588951206413

token = 0.0
basket = 11.0
transaction = 89.0

_proportion = proportion(basket, token, transaction)
0.89
_deviation = deviation(_proportion, target)
0.39
_deviationLogit = deviationLogit(_deviation, target)
4.571428571428571
_normalMultiplier = normalMultiplier(_deviationLogit)
0.660051938305649
fee(depositFee, scalingFactor, _normalMultiplier)
0.13300259691528246

token = 0.0
basket = 89.0
transaction = 11.0

_proportion = proportion(basket, token, transaction)
0.11
_deviation = deviation(_proportion, target)
-0.39
_deviationLogit = deviationLogit(_deviation, target)
0.21875000000000003
_normalMultiplier = normalMultiplier(_deviationLogit)
-0.660051938305649
fee(depositFee, scalingFactor, _normalMultiplier)
0.06699740308471755

token = 0.0
basket = 10.0
transaction = 90.0

_proportion = proportion(basket, token, transaction)
0.9
_deviation = deviation(_proportion, target)
0.4
_deviationLogit = deviationLogit(_deviation, target)
4.333333333333333
_normalMultiplier = normalMultiplier(_deviationLogit)
0.6368220975871742
fee(depositFee, scalingFactor, _normalMultiplier)
0.1318411048793587



