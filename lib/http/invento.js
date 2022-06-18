let axios = require('axios');

const getProductInvento = async () => {

  let configAxios = {
    method: 'get',
    url: `http://api.digigrow.com.br:2530/sku`,
    headers: {
      'Content-Type': 'application/json',
      'tokenaccount': 'ZW7XR3QB0S4SE1A',
      'Authorization': 'Bearer SW52ZW50b1Npc3RlbWFzL0h1YkRpZ2lncm93L1BlcnNpc3RlbnRBY2Nlc3MvR2VuZXJhdGVkQnlEaWVnby8wMzA1MjAyMQ=='
    },

  };

  return (await axios(configAxios)).data
}


module.exports = { getProductInvento }