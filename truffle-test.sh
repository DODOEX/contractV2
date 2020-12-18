#!/bin/bash
truffle compile --all

if [ "$1"x = "proxy-dpp"x ]
then
	truffle test ./test/Proxy/proxy.dpp.test.ts
fi
 
if [ "$1"x = "proxy-dvm"x ]
then
	truffle test ./test/Proxy/proxy.dvm.test.ts
fi

if [ "$1"x = "proxy-mix"x ]
then
	truffle test ./test/Proxy/proxy.mix.test.ts
fi

if [ "$1"x = "proxy-classical"x ]
then
	truffle test ./test/Proxy/proxy.classical.test.ts
fi

if [ "$1"x = "proxy-cp"x ]
then
	truffle test ./test/Proxy/proxy.cp.test.ts
fi

if [ "$1"x = "route"x ]
then
	truffle test ./test/Route/route.test.ts
fi

	