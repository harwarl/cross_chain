//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/IMintableBurnable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";


contract Pool is Ownable {
    struct TokenInfo {
        address tokenAddress;
        uint256 chainId;
    }

    mapping(bytes32 => TokenInfo) public tokenDetails;

    /**
     * @notice Emitted when a new Token is added
     * @param symbol symbol of the token e.g ETH
     * @param tokenAddress address of the token
     * @param chainId chain of the token
     */
    event TokenAdded(bytes32 indexed symbol, address tokenAddress, uint256 chainId);
    
    /**
     * @notice Emitted when an existing token is removed
     * @param symbol symbol of the token e.g ETH
     * @param chainId chain of the token
     */
    event TokenRemoved(bytes32 indexed symbol, uint256 chainId);

    /* ========== CONSTRUCTOR ========== */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice adds a new token to the list of accepted tokens
     * @param _symbol symbol of the token e.g ETH
     * @param _chainId is the chain Id of the chain
     * @param _tokenAddress is the address of the token to be added
     */
    function addToken(string memory _symbol, uint256 _chainId, address _tokenAddress) external onlyOwner {
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        require(tokenDetails[tokenKey].tokenAddress == address(0), "Pool: Token already exists");

        tokenDetails[tokenKey] = TokenInfo({
            tokenAddress: _tokenAddress,
            chainId: _chainId
        });

        emit TokenAdded(tokenKey, _tokenAddress, _chainId);
    }

    /**
     * @notice removes an existing token from the list of accepted tokens
     * @param _symbol symbol of the token e.g ETH
     * @param _chainId is the chain Id of the chain
     */
    function removeToken(string memory _symbol, uint256 _chainId) external onlyOwner {
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        require(tokenDetails[tokenKey].tokenAddress != address(0), "Pool: Token does not exist");

        delete tokenDetails[tokenKey];
        emit TokenRemoved(tokenKey, _chainId);
    }

    /**
     * @notice checks if a token is in the list of supported tokens
     * @param _symbol symbol of the token e.g ETH
     * @param _chainId is the chain Id of the chain
     */
    function isTokenSupported(string memory _symbol, uint256 _chainId) public view returns (bool){
        bytes32 tokenKey = keccak256(abi.encodePacked(_symbol, _chainId));
        return tokenDetails[tokenKey].tokenAddress != address(0);
    }

    /**
     * @notice mints token 
     * @param _symbol symbol of the token e.g ETH
     * @param _chainId is the chain Id of the chain
     * @param _to address the token is to be minted to
     * @param _amount amount to be minted
     */
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

    /**
     * @notice burns the token of the sender
     * @param _symbol symbol of the token e.g ETH
     * @param _chainId is the chain Id of the chain
     * @param _from address the token is to be burned from
     * @param _amount amount to be burned
     */
    function _burn(
        string memory _symbol,
        uint256 _chainId,
        address _from,
        uint256 _amount
    ) internal {

        bytes32 tokenKey = keccak256((abi.encodePacked(_symbol, _chainId)));
        TokenInfo memory tokenInfo = tokenDetails[tokenKey];
        require(IERC20(tokenInfo.tokenAddress).balanceOf(_from) > _amount, "Pool: Insuffient Balance" );

        require(tokenInfo.tokenAddress != address(0), "Pool: Token not supported");
        
        IMintableBurnable(tokenInfo.tokenAddress).burn(_from, _amount);
    }
}