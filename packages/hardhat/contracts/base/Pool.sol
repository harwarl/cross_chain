//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/IMintableBurnable.sol";

contract Pool is Ownable {
    struct TokenInfo {
        address tokenAddress;
        uint256 chainId;
    }

    mapping(bytes32 => TokenInfo) public tokenDetails;

    event TokenAdded(bytes32 indexed symbol, address tokenAddress, uint256 chainId);
    event TokenRemoved(bytes32 indexed symbol, uint256 chainId);

    constructor() Ownable(msg.sender) {}

    function addToken(string memory _symbol, uint256 _chainId, address _tokenAddress) external onlyOwner {
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        require(tokenDetails[tokenKey].tokenAddress == address(0), "Pool: Token already exists");

        tokenDetails[tokenKey] = TokenInfo({
            tokenAddress: _tokenAddress,
            chainId: _chainId
        });

        emit TokenAdded(tokenKey, _tokenAddress, _chainId);
    }


    function removeToken(string memory _symbol, uint256 _chainId) external onlyOwner {
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        require(tokenDetails[tokenKey].tokenAddress != address(0), "Pool: Token does not exist");

        delete tokenDetails[tokenKey];
        emit TokenRemoved(tokenKey, _chainId);
    }

    function isTokenSupported(string memory _symbol, uint256 _chainId) public view returns (bool){
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        return tokenDetails[tokenKey].tokenAddress != address(0);
    }

    function _mint(
        string memory _symbol, 
        uint256 _chainId,
        address _to,
        uint256 _amount
    ) internal {
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        TokenInfo memory tokenInfo = tokenDetails[tokenKey];

        require(tokenInfo.tokenAddress != address(0), "Pool: Token not supported");
        
        IMintableBurnable(tokenInfo.tokenAddress).mint(_to, _amount);
    }

    function _burn(
        string memory _symbol,
        uint256 _chainId,
        address _from,
        uint256 _amount
    ) internal {
        bytes32 tokenKey = keccak256((abi.encodePacked(_symbol, _chainId)));
        TokenInfo memory tokenInfo = tokenDetails[tokenKey];

        require(tokenInfo.tokenAddress != address(0), "Pool: Token not supported");
        
        IMintableBurnable(tokenInfo.tokenAddress).burn(_from, _amount);
    }
}