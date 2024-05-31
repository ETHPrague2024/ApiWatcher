const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const API_URL =
  'https://api.pwn.xyz/api/v1/loan/?collateral_type=&include_testnets=false&limit=10&network__in=11155111&offset=0&order_by=-id&shit_filter_on=false&status__in=1';
const CHECK_INTERVAL = 60000; // 60 seconds

let processedLoanIds = new Set();

// Function to determine if the contract is ERC20 or ERC721
const getContractStandard = async (address, provider) => {
  const contract = new ethers.Contract(
    address,
    [
      'function supportsInterface(bytes4 interfaceId) public view returns (bool)',
      'function totalSupply() public view returns (uint256)',
    ],
    provider
  );

  try {
    const erc721InterfaceId = '0x80ac58cd';
    const supportsERC721 = await contract
      .supportsInterface(erc721InterfaceId)
      .catch((e) => false);
    if (supportsERC721) {
      return 'ERC721';
    }

    const erc1155InterfaceId = '0xd9b67a26';
    const supportsERC1155 = await contract
      .supportsInterface(erc1155InterfaceId)
      .catch((e) => false);
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

const advertiseNewLoan = async (loan) => {
  const provider = new ethers.providers.InfuraProvider(
    'sepolia'
  );
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    [
      'function advertiseNewLoan(address tokenCollateralAddress,uint256 tokenCollateralAmount,uint256 tokenCollateralIndex,address tokenLoanAddress,uint256 tokenLoanAmount,uint256 tokenLoanIndex,uint256 durationOfLoanSeconds,uint256 chainId,uint256 loanId) public',
    ],
    wallet
  );

  const tx = await contract.advertiseNewLoan(
    loan.tokenCollateralAddress,
    loan.tokenCollateralAmount,
    loan.tokenCollateralIndex,
    loan.tokenLoanAddress,
    loan.tokenLoanAmount,
    loan.tokenLoanIndex,
    loan.durationOfLoanSeconds,
    loan.chainId,
    loan.loanId
  );

  console.log(`Transaction hash: ${tx.hash}`);
  await tx.wait();
};

const checkPWNAPI = async () => {
  try {
    const response = await axios.get(API_URL);
    const currentResponseObject = response.data;

    // Filter out results where loan_request_is_instant_funding is not true
    const filteredResults = currentResponseObject.results.filter(
      (item) => item.loan_request_is_instant_funding === true
    );

    // Filter out already processed loan IDs
    const newResults = filteredResults.filter(
      (item) => !processedLoanIds.has(item.id)
    );

    const validResults = [];

    for (const result of newResults) {
      const collateralContract = result.collateral.contract.address;
      const desiredAssetContract = result.desired_asset.contract.address;

      const collateralChainId = result.chain_id;
      const desiredAssetChainId = result.desired_asset.contract.chain_id;

      if (collateralChainId !== desiredAssetChainId) continue;

      const collateralNetwork = ethers.providers.getNetwork(collateralChainId);
      const desiredAssetNetwork =
        ethers.providers.getNetwork(desiredAssetChainId);

      const collateralProvider = new ethers.providers.InfuraProvider(
        collateralNetwork
      );
      const desiredAssetProvider = new ethers.providers.InfuraProvider(
        desiredAssetNetwork
      );

      const collateralStandard = await getContractStandard(
        collateralContract,
        collateralProvider
      );
      const desiredAssetStandard = await getContractStandard(
        desiredAssetContract,
        desiredAssetProvider
      );

      // Filter results: Only include if both are ERC721 or ERC20
      if (
        (collateralStandard === 'ERC721' || collateralStandard === 'ERC20') &&
        (desiredAssetStandard === 'ERC721' || desiredAssetStandard === 'ERC20')
      ) {
        validResults.push(result);
        console.log(
          `Loan ID: ${result.id} has supported contract standards. Collateral: ${collateralStandard}, Desired Asset: ${desiredAssetStandard}`
        );
      } else {
        console.log(
          `Loan ID: ${result.id} has unsupported contract standards. Collateral: ${collateralStandard}, Desired Asset: ${desiredAssetStandard}`
        );
        processedLoanIds.add(result.id);
      }
    }

    const newLoanIds = validResults.map((result) => result.id);

    if (newLoanIds.length === 0) {
      console.log('No new eligible loans detected.');
      return;
    }

    console.log('Change detected!');
    console.log('New Count of Eligible Loans', newLoanIds.length);

    newLoanIds.forEach(async (id) => {
      const result = validResults.find((res) => res.id === id);

      const newLoanAdvertisedObject = {
        tokenCollateralAddress: result.collateral.contract.address,
        tokenCollateralAmount: result.collateral_amount,
        tokenCollateralIndex:
          result.collateral.token_id ||
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        tokenLoanAddress: result.desired_asset.contract.address,
        tokenLoanAmount: result.desired_amount,
        tokenLoanIndex:
          result.desired_asset.token_id ||
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        tokenLoanRepaymentAmount: result.desired_to_be_paid,
        durationOfLoanSeconds: result.desired_duration,
        chainId: result.chain_id,
        loanId: result.id,
      };
      console.log('New Loan Advertised:', newLoanAdvertisedObject);

      await advertiseNewLoan(newLoanAdvertisedObject);

      processedLoanIds.add(id);
    });
  } catch (error) {
    console.error('Error checking API:', error);
  }
};

checkPWNAPI();
setInterval(checkPWNAPI, CHECK_INTERVAL);
