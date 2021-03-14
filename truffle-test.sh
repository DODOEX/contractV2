#!/bin/bash
# truffle compile --all

if [ "$1"x = "proxy-dpp"x ]
then
	truffle test ./test/V2Proxy/proxy.dpp.test.ts
fi
 
if [ "$1"x = "proxy-dvm"x ]
then
	truffle test ./test/V2Proxy/proxy.dvm.test.ts
fi

if [ "$1"x = "proxy-mix"x ]
then
	truffle test ./test/V2Proxy/proxy.mix.test.ts
fi

if [ "$1"x = "proxy-classical"x ]
then
	truffle test ./test/V2Proxy/proxy.classical.test.ts
fi

if [ "$1"x = "proxy-cp"x ]
then
	truffle test ./test/V2Proxy/proxy.cp.test.ts
fi

if [ "$1"x = "proxy-incentive"x ]
then
	truffle test ./test/V2Proxy/proxy.incentive.test.ts
fi

if [ "$1"x = "proxy-incentive-bsc"x ]
then
	truffle test ./test/V2Proxy/proxy.incentive.bsc.test.ts
fi

if [ "$1"x = "proxy-twap"x ]
then
	truffle test ./test/V2Proxy/proxy.twap.test.ts
fi

if [ "$1"x = "vdodo-mintRedeem"x ]
then
	truffle test ./test/vDODO/mintRedeem.test.ts
fi


# if [ "$1"x = "route-incentive"x ]
# then
# 	truffle test ./test/Route/Incentive.test.ts
# fi

# if [ "$1"x = "route"x ]
# then
# 	truffle test ./test/Route/route.test.ts
# fi