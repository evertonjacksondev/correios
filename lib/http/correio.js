let axios = require('axios');

const calcPrecoPrazo = async (params, userToken) => {

  let configAxios = {
    method: 'get',
    url: `http://localhost:2540/v1/front/correio/prazoentrega`,
    headers: {
      'Content-Type': 'application/json',
      'userToken': userToken
    },
    params,

  };

  return (await axios(configAxios)).data
}


module.exports = { calcPrecoPrazo }