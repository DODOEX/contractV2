/*

    Copyright 2022 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {InitializableOwnable} from "../lib/InitializableOwnable.sol";


contract PoolHeartBeat is InitializableOwnable {

    struct heartBeat {
        uint256 lastHeartBeat;
        uint256 maxInterval;
    }
    
    mapping(address => address) public poolHeartBeatManager; // pool => heartbeat manager
    mapping(address => heartBeat) public beats; // heartbeat manager => heartbeat

    function isPoolHeartBeatLive(address pool) external view returns(bool) {
        if(poolHeartBeatManager[pool]==address(0)) {
            return true;
        }
        heartBeat memory beat = beats[poolHeartBeatManager[pool]];
        return block.timestamp - beat.lastHeartBeat < beat.maxInterval;
    }

    function triggerBeat() external {
        heartBeat storage beat = beats[msg.sender];
        beat.lastHeartBeat = block.timestamp;
    }

    function setBeatInterval(uint256 interval) external {
        heartBeat storage beat = beats[msg.sender];
        beat.maxInterval = interval;
    }

    function bindPoolHeartBeat(address[] memory pools, address manager) external onlyOwner {
        for(uint256 i=0; i<pools.length; i++) {
            poolHeartBeatManager[pools[i]] = manager;
        }
    }
}