import math

scalingFactor = 0.5
redemptionFee = 0.1
target = 0.5

def lowerBound(_target):
    return -0.4999*target

def upperBound(_target):
    return 0.4*target

def proportion(_basket, _token, _transaction):
    return (_token - _transaction)/(_basket - _transaction)

def deviation(_proportion, _target):
    return _proportion - _target

def deviationCurve(_deviation, _target):
    return (_deviation+_target/2)/(target/2-_deviation)

def deviationLogit(_deviationCurve):
    return math.log(_deviationCurve, 10)

def fee(_redemptionFee, _scalingFactor, _deviationLogit):
    return redemptionFee - (_redemptionFee * _scalingFactor * _deviationLogit)

_lowerBound = lowerBound(target)
_lowerBound
-0.24995
_upperBound = upperBound(target)
_upperBound
0.2

token = 120.0
basket = 150.0
transaction = ((_lowerBound+target)*basket-token)/(_lowerBound+target-1)
transaction += 1
transaction
110.99733315554371
transaction = 111

_proportion = proportion(basket, token, transaction)
_proportion
0.23076923076923078
_deviation = deviation(_proportion, target)
_deviation
-0.2692307692307692
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
-0.037037037037037014
_deviationLogit
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name '_deviationLogit' is not defined
fee(redemptionFee, scalingFactor, _deviationLogit)
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name '_deviationLogit' is not defined

_deviation = -0.24995
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
0.000100010001000089
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
-3.99995656838024
fee(redemptionFee, scalingFactor, _deviationLogit)
0.299997828419012

transaction -= 2
transaction
109
transaction = 109

_proportion = proportion(basket, token, transaction)
_proportion
0.2682926829268293
_deviation = deviation(_proportion, target)
_deviation
-0.23170731707317072
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
0.03797468354430383
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
-1.4205058365707786
fee(redemptionFee, scalingFactor, _deviationLogit)
0.17102529182853893

transaction = ((_upperBound+target)*basket-token)/(_upperBound+target-1)
transaction -= 1
transaction
48.99999999999999
transaction = 49

_proportion = proportion(basket, token, transaction)
_proportion
0.7029702970297029
_deviation = deviation(_proportion, target)
_deviation
0.20297029702970293
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
9.631578947368412
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
0.9836974887776001
fee(redemptionFee, scalingFactor, _deviationLogit)
0.05081512556112

_deviation = 0.2
_deviationCurve = deviationCurve(_deviation, target)
9.000000000000002
_deviationCurve
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
0.9542425094393249
fee(redemptionFee, scalingFactor, _deviationLogit)
0.05228787452803376

transaction += 2
transaction
51
transaction = 51

_proportion = proportion(basket, token, transaction)
_proportion
0.696969696969697
_deviation = deviation(_proportion, target)
_deviation
0.19696969696969702
_deviationCurve = deviationCurve(_deviation, target)
_deviationCurve
8.428571428571438
_deviationLogit = deviationLogit(_deviationCurve)
_deviationLogit
0.9257539716278878
fee(redemptionFee, scalingFactor, _deviationLogit)
0.05371230141860561
