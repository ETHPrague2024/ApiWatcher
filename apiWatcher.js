const axios = require('axios');

const API_URL = 'https://api.pwn.xyz/api/v1/loan/?collateral_type=&include_testnets=false&is_verified=true&limit=10&ltv_ranges=0%2C80%2C0%2C20%2C60%2C80&offset=0&order_by=-appraisal&shit_filter_on=true&status__in=1';
const CHECK_INTERVAL = 60000; // 60 seconds

let lastResponse = null;

const checkPWNAPI = async () => {
    try {
        const response = await axios.get(API_URL);
        const currentResponseObject = response.data;
        const currentResponse = JSON.stringify(currentResponseObject, null, 2);

        if (lastResponse && lastResponse !== currentResponse) {
            console.log('Change detected!');
            console.log('Old Response:');
            console.log(JSON.parse(lastResponse).results.length);
            console.log('New Response:');
            console.log(currentResponseObject.results.length);
        } else if (!lastResponse) {
            console.log('Initial Response:');
            console.log(currentResponseObject.results.length);
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
