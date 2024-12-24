// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract MintableERC20Mock is ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function mint(address _to, uint _amount) external {
        _mint(_to, _amount);
    }

    function approveAndLog(address spender, uint256 amount) external {
        _approve(msg.sender, spender, amount);
        console.log("Allowance set for spender:", spender, "Allowance:", allowance(msg.sender, spender));
    }
}