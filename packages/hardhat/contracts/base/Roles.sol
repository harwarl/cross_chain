//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;



abstract contract Roles {
    address public signer;

    constructor (address _signer) {
        signer = _signer;
    }

    function setSigner(address _signer) public {
        signer = _signer;
    }
}