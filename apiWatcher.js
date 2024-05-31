const axios = require('axios');
const { ethers } = require('ethers');

const API_URL = 'https://api.pwn.xyz/api/v1/loan/?collateral_type=&include_testnets=false&is_verified=true&limit=10&ltv_ranges=0%2C80%2C0%2C20%2C60%2C80&offset=0&order_by=-appraisal&shit_filter_on=true&status__in=1';
const CHECK_INTERVAL = 60000; // 60 seconds

let lastResponse = null;

// Function to determine if the contract is ERC20 or ERC721
const getContractStandard = async (address, provider) => {
    const contract = new ethers.Contract(address, [
        'function supportsInterface(bytes4 interfaceId) public view returns (bool)',
        'function totalSupply() public view returns (uint256)',
    ], provider);

    try {
        const erc721InterfaceId = '0x80ac58cd';
        const supportsERC721 = await contract.supportsInterface(erc721InterfaceId).catch (e => {
            return false
        });
        if (supportsERC721) {
            return 'ERC721';
        }

        const erc1155InterfaceId = '0xd9b67a26';
        const supportsERC1155 = await contract.supportsInterface(erc1155InterfaceId).catch (e => {
            return false
        });;
        if (supportsERC1155) {
            return 'ERC1155';
        }

        // Try fetching totalSupply to check for ERC20
        await contract.totalSupply();
        return 'ERC20';
    } catch (error) {
        console.error(`Error checking contract at ${address}:`, error);
        return 'Unknown';
    }
};

const checkPWNAPI = async () => {
    try {
        const response = await axios.get(API_URL);
        const currentResponseObject = response.data;

        // Filter out results where loan_request_is_instant_funding is not true
        const filteredResults = currentResponseObject.results.filter(item => item.loan_request_is_instant_funding === true);

        const validResults = [];

        for (const result of filteredResults) {
            const collateralContract = result.collateral.contract.address;
            const desiredAssetContract = result.desired_asset.contract.address;

            const collateralChainId = result.chain_id;
            const desiredAssetChainId = result.desired_asset.contract.chain_id;

            if (collateralChainId !== desiredAssetChainId) continue;

            const collateralNetwork = ethers.providers.getNetwork(collateralChainId);
            const desiredAssetNetwork = ethers.providers.getNetwork(desiredAssetChainId);

            const collateralProvider = new ethers.providers.InfuraProvider(collateralNetwork);
            const desiredAssetProvider = new ethers.providers.InfuraProvider(desiredAssetNetwork);

            const collateralStandard = await getContractStandard(collateralContract, collateralProvider);
            const desiredAssetStandard = await getContractStandard(desiredAssetContract, desiredAssetProvider);

            // Filter results: Only include if both are ERC721 or ERC20
            if ((collateralStandard === 'ERC721' || collateralStandard === 'ERC20') &&
                (desiredAssetStandard === 'ERC721' || desiredAssetStandard === 'ERC20')) {
                validResults.push(result);
                console.log(`Loan ID: ${result.id} has supported contract standards. Collateral: ${collateralStandard}, Desired Asset: ${desiredAssetStandard}`);
            } else {
                console.log(`Loan ID: ${result.id} has unsupported contract standards. Collateral: ${collateralStandard}, Desired Asset: ${desiredAssetStandard}`);
            }
        }

        const currentResponse = JSON.stringify(validResults, null, 2);

        if (lastResponse && lastResponse !== currentResponse) {
            console.log('Change detected!');
            console.log('Old Count of Eligible Loans', JSON.parse(lastResponse).length);
            console.log('New Count of Eligible Loans', validResults.length);
        } else if (!lastResponse) {
            console.log('Initial Count of Eligible Loans', validResults.length);
        } else {
            console.log('No change detected.');
        }

        lastResponse = currentResponse;
    } catch (error) {
        console.error('Error checking API:', error);
    }
};

checkPWNAPI();
setInterval(checkPWNAPI, CHECK_INTERVAL);
