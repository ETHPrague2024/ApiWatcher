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
  const provider = new ethers.providers.InfuraProvider('sepolia');

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    '0x981Ff5aC5402b7fA1099Cd6bad653B40D8c949C9', // SEPOLIA, THIS ONE IS TEST
    [
      {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'loanID',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'tokenCollateralAddress',
            type: 'address',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenCollateralAmount',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenCollateralIndex',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'tokenLoanAddress',
            type: 'address',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenLoanAmount',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenLoanIndex',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenLoanRepaymentAmount',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'durationOfLoanSeconds',
            type: 'uint256',
          },
        ],
        name: 'NewLoanAdvertised',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'LoanFilled',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'LoanOfferRevoked',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'LoanClaimed',
        type: 'event',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'getLoan',
        outputs: [
          {
            components: [
              {
                internalType: 'address',
                name: 'tokenCollateralAddress',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'tokenCollateralAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'tokenCollateralIndex',
                type: 'uint256',
              },
              {
                internalType: 'enum IPWNSimpleLoanSimpleOffer.Category',
                name: 'tokenCollateralCategory',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'tokenCollateralId',
                type: 'uint256',
              },
              {
                internalType: 'address',
                name: 'tokenLoanAddress',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'tokenLoanAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'tokenLoanIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'tokenLoanRepaymentAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'loanYield',
                type: 'uint256',
              },
              {
                internalType: 'uint32',
                name: 'durationOfLoanSeconds',
                type: 'uint32',
              },
              {
                internalType: 'uint40',
                name: 'expiration',
                type: 'uint40',
              },
              {
                internalType: 'address',
                name: 'borrower',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'advertiser',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'filler',
                type: 'address',
              },
              {
                internalType: 'bytes',
                name: 'signature',
                type: 'bytes',
              },
              {
                internalType: 'uint256',
                name: 'nonce',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'chainId',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'loanId',
                type: 'uint256',
              },
              {
                internalType: 'enum PWNLoan.LoanState',
                name: 'state',
                type: 'uint8',
              },
            ],
            internalType: 'struct PWNLoan.Loan',
            name: '',
            type: 'tuple',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'tokenCollateralAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralIndex',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'tokenLoanAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanRepaymentAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'durationOfLoanSeconds',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
          {
            internalType: 'enum IPWNSimpleLoanSimpleOffer.Category',
            name: 'tokenCollateralCategory',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanYield',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expiration',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'borrower',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        name: 'advertiseNewLoan',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'revokeLoanOffer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'fulfillLoan',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'chainId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loanId',
            type: 'uint256',
          },
        ],
        name: 'claimLoan',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'tokenCollateralAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralIndex',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'tokenLoanAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanIndex',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isCollateralNFT',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'isLoanNFT',
            type: 'bool',
          },
        ],
        name: 'checkBalances',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'tokenCollateralAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenCollateralAmount',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isCollateralNFT',
            type: 'bool',
          },
          {
            internalType: 'address',
            name: 'to',
            type: 'address',
          },
        ],
        name: 'transferCollateral',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'tokenLoanAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'tokenLoanRepaymentAmount',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isLoanNFT',
            type: 'bool',
          },
          {
            internalType: 'address',
            name: 'to',
            type: 'address',
          },
        ],
        name: 'transferLoan',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'operator',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'from',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenId',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes',
          },
        ],
        name: 'onERC721Received',
        outputs: [
          {
            internalType: 'bytes4',
            name: '',
            type: 'bytes4',
          },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
      },
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
    loan.tokenLoanRepaymentAmount,
    loan.durationOfLoanSeconds,
    loan.chainId,
    loan.loanId,
    loan.tokenCollateralCategory,
    loan.tokenCollateralId,
    loan.loanYield,
    loan.expiration,
    loan.borrower,
    loan.nonce,
    loan.signature
  );

  console.log(`Transaction hash: ${tx.hash}`);
  await tx.wait();
};

const checkPWNAPI = async () => {
  try {
    const response = await axios.get(API_URL);
    const currentResponseObject = response.data;

    const filteredResults = currentResponseObject.results.filter(
      (item) => item.loan_request_is_instant_funding === true
    );

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

    if (validResults.length === 0) {
      console.log('No new eligible loans detected.');
      return;
    }

    console.log('Change detected!');
    console.log('New Count of Eligible Loans', validResults.length);

    const provider = new ethers.providers.InfuraProvider('sepolia');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    let nonce = await provider.getTransactionCount(wallet.address);

    for (const result of validResults) {
      const newLoanAdvertisedObject = {
        tokenCollateralAddress: result.collateral.contract.address,
        tokenCollateralAmount:
          result.collateral.contract.category === 1
            ? '0'
            : result.collateral_amount,
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
        tokenCollateralCategory: result.collateral.contract.category,
        tokenCollateralId: result.collateral.token_id || 0,
        loanYield: result.desired_loan_yield,
        expiration: result.loan_request_expiration_timestamp,
        borrower: result.borrower_address,
        nonce: result.loan_request_nonce,
        signature: result.loan_request_signature,
      };
      console.log('New Loan Advertised:', newLoanAdvertisedObject);

      await advertiseNewLoan(newLoanAdvertisedObject, nonce);
      nonce++;
      processedLoanIds.add(result.id);
    }
  } catch (error) {
    console.error('Error checking API:', error);
  }
};

checkPWNAPI();
setInterval(checkPWNAPI, CHECK_INTERVAL);
