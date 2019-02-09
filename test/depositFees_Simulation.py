import math

scalingFactor = 0.5
depositFee = 0.1
target = 0.5

def lowerBound(_target):
    return -0.4*target

def upperBound(_target):
    return 0.4*target

def proportion(_basket, _token, _transaction):
    return (_token + _transaction)/(_basket + _transaction)

def deviation(_proportion, _target):
    return _proportion - _target

def deviationCurve(_deviation, _target):
    return (_deviation+_target/2)/(target/2-_deviation)

def deviationLogit(_deviationCurve):
    return math.log(_deviationCurve, 10)

def fee(_depositFee, _scalingFactor, _deviationLogit):
    return depositFee + (_depositFee * _scalingFactor * _deviationLogit)

_lowerBound = lowerBound(target)
_lowerBound
-0.2
_upperBound = upperBound(target)
_upperBound
0.2

token = 0.0
transaction = (target - _lowerBound) * 100.0
transaction
70.0
basket = 100.0 - transaction
basket
30.0

_proportion = proportion(basket, token, transaction)
_proportion
0.7
_deviation = deviation(_proportion, target)
_deviation
0.19999999999999996
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
8.999999999999991
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
0.9542425094393243
fee(depositFee, scalingFactor, _deviationLogit)
0.14771212547196622

token = 0.0
transaction = (target - _lowerBound) * 100.0 + 1
transaction
71.0
basket = 100.0 - transaction
basket
29.0

_proportion = proportion(basket, token, transaction)
_proportion
0.71
_deviation = deviation(_proportion, target)
_deviation
0.20999999999999996
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
11.49999999999999
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
1.0606978403536111
fee(depositFee, scalingFactor, _deviationLogit)
0.15303489201768056

token = 0.0
transaction = (target - _upperBound) * 100.0 - 1
transaction
29.0
basket = 100.0 - transaction
basket
71.0

_proportion = proportion(basket, token, transaction)
_proportion
0.29
_deviation = deviation(_proportion, target)
_deviation
-0.21000000000000002
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
0.08695652173913039
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
-1.0606978403536118
fee(depositFee, scalingFactor, _deviationLogit)
0.04696510798231941

token = 0.0
transaction = (target - _upperBound) * 100.0
transaction
30.0
basket = 100.0 - transaction
basket
70.0

_proportion = proportion(basket, token, transaction)
_proportion
0.3
_deviation = deviation(_proportion, target)
_deviation
-0.2
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
0.11111111111111108
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
-0.9542425094393249
fee(depositFee, scalingFactor, _deviationLogit)
0.05228787452803376

_proportion = proportion(basket, token, transaction)
_proportion
_deviation = deviation(_proportion, target)
_deviation
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
fee(depositFee, scalingFactor, _deviationLogit)
