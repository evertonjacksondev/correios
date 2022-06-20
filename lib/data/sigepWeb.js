const soap = require('soap');
const cliProgress = require('cli-progress');

const { calcPrecoPrazo } = require('../http/correio');


const correiosURL = (type) => {
  return type == 'cep' ?
    `https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente?wsdl` :
    "http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx?wsdl"
};

const clientSoap = async (env) => {
  const url = correiosURL(env)
  return await soap.createClientAsync(url)
};

const prepareTags = tagsRange => {
  const tags = tagsRange.split(',')
  const inicial = parseInt(tags[0].substring(2, 10))
  const final = parseInt(tags[1].substring(2, 10))
  const prefix = tags[0].substring(0, 2)
  const sufix = tags[0].substring(10).trim()

  const returnTags = []
  for (let i = inicial; i <= final; i++) {
    returnTags.push(genTagDigit(prefix + String(i).padStart(8, '0') + ' ' + sufix))
  }
  return returnTags
};

const genTagDigit = numeroEtiqueta => {
  let prefixo = numeroEtiqueta.substring(0, 2)
  let numero = numeroEtiqueta.substring(2, 10)
  let sufixo = numeroEtiqueta.substring(10).trim()
  let retorno = numero
  let dv
  let multiplicadores = [8, 6, 4, 2, 3, 5, 9, 7]
  let soma = 0


  // Preenche número com 0 à esquerda
  if (numeroEtiqueta.length < 12) {
    retorno = "Error...";
  } else if (numero.length < 8 && numeroEtiqueta.length == 12) {
    let zeros = ''
    let diferenca = 8 - numero.length
    for (let i = 0; i < diferenca; i++) {
      zeros += '0'
    }
    retorno = zeros + numero
  } else {
    retorno = numero.substring(0, 8);
  }
  for (let i = 0; i < 8; i++) {
    soma += parseInt(retorno.substring(i, (i + 1))) * multiplicadores[i]
  }

  let resto = soma % 11
  if (resto == 0) {
    dv = '5'
  } else if (resto == 1) {
    dv = '0'
  } else {
    dv = parseInt(11 - resto).toString()
  }
  retorno += dv
  retorno = prefixo + retorno + sufixo
  return retorno
};

const calcFreight = async (client, filter) => {

  try {

    let filterCalc = {};

    let {
      nCdEmpresa,
      sDsSenha,
      nCdServico,
      sCepOrigem,
      sCepDestino,
      nVlPeso,
      nCdFormato,
      nVlComprimento,
      nVlAltura,
      nVlLargura,
      nVlDiametro,
      sCdMaoPropria,
      nVlValorDeclarado,
      sCdAvisoRecebimento } = filter;


    // if (nCdEmpresa) throw 'nCdEmpresa required !'
    // if (sDsSenha) throw 'sDsSenha required !'
    if (!nCdServico) throw 'nCdServico required !'
    if (!sCepOrigem) throw 'sCepOrigem required !'
    if (!sCepDestino) throw 'sCepDestino required !'
    if (!nVlPeso) throw 'nVlPeso required !'
    if (!nCdFormato) throw 'nCdFormato required !'
    if (!nVlComprimento) throw 'nVlComprimento required !'
    if (!nVlAltura) throw 'nVlAltura required !'
    if (!nVlLargura) throw 'nVlLargura required !'
    if (!nVlDiametro) throw 'nVlDiametro required !'
    if (!sCdMaoPropria) throw 'sCdMaoPropria required !'
    if (!nVlValorDeclarado) throw 'nVlValorDeclarado required !'
    if (!sCdAvisoRecebimento) throw 'sCdAvisoRecebimento required !'

    if (nCdEmpresa) filterCalc['nCdEmpresa'] = nCdEmpresa;
    if (sDsSenha) filterCalc['sDsSenha'] = sDsSenha;
    if (nCdServico) filterCalc['nCdServico'] = nCdServico;
    if (sCepOrigem) filterCalc['sCepOrigem'] = sCepOrigem;
    if (sCepDestino) filterCalc['sCepDestino'] = sCepDestino;
    if (nVlPeso) filterCalc['nVlPeso'] = nVlPeso;
    if (nCdFormato) filterCalc['nCdFormato'] = Number(nCdFormato);
    if (nVlComprimento) filterCalc['nVlComprimento'] = nVlComprimento;
    if (nVlAltura) filterCalc['nVlAltura'] = nVlAltura;
    if (nVlLargura) filterCalc['nVlLargura'] = nVlLargura;
    if (nVlDiametro) filterCalc['nVlDiametro'] = nVlDiametro;
    if (sCdMaoPropria) filterCalc['sCdMaoPropria'] = sCdMaoPropria;
    if (nVlValorDeclarado) filterCalc['nVlValorDeclarado'] = Number(nVlValorDeclarado);
    if (sCdAvisoRecebimento) filterCalc['sCdAvisoRecebimento'] = sCdAvisoRecebimento;

    let result = (await client.CalcPrecoPrazoAsync(filterCalc))[0].CalcPrecoPrazoResult.Servicos.cServico[0]

    return result;

  } catch (err) {
    err
  }

};

const updatePriceFreight = async (db, userToken) => {
  try {
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);


    let fieldsWeith = [
      "0.300",
      "0.500",
      "1.000",
      "2.000",
      "3.000",
      "4.000",
      "5.000",
      "6.000",
      "7.000",
      "8.000",
      "9.000",
      "10.000",
      "11.000",
      "12.000",
      "13.000",
      "14.000",
      "15.000",
      "16.000",
      "17.000",
      "18.000",
      "19.000",
      "20.000",
      "21.000",
      "22.000",
      "23.000",
      "24.000",
      "25.000",
      "26.000",
      "27.000",
      "28.000",
      "29.000",
      "30.000",
    ]

    let contractSigepWebColl = db.collection('contractSigepWeb');
    let contractSigepWeb = await contractSigepWebColl.find({}).toArray();
    let zipCodeColl = db.collection('cep');
    let freightColl = db.collection('freight')
    let zipCode = await zipCodeColl.find({}).toArray();
    let cServico = ['03298', '03220']

    bar1.start(zipCode.length, 0);

    for (let sigep of contractSigepWeb) {

      let { cepOrigin, senha, administrador } = sigep;

      for (let zip of zipCode) {

        let { UF, zipStart, zipEnd } = zip;

        for (let weith of fieldsWeith) {

          for (let servico of cServico) {
            try {
              if (servico == '03220' && UF == 'SP' || UF != 'SP' && servico == '03298') {
                let params = {
                  nCdEmpresa: administrador,
                  sDsSenha: senha,
                  nCdServico: servico,
                  sCepOrigem: cepOrigin,
                  sCepDestino: zipEnd,
                  nVlPeso: weith,
                  nCdFormato: 1,
                  nVlComprimento: 60,
                  nVlAltura: 10,
                  nVlLargura: 10,
                  nVlDiametro: 10,
                  sCdMaoPropria: 'N',
                  nVlValorDeclarado: 0,
                  sCdAvisoRecebimento: 'N'

                }
                let resultCalc = await calcPrecoPrazo(params, userToken);

                switch (servico) {
                  case "03220":
                    servico = "SEDEX";
                    break;
                  case "03298":
                    servico = "PAC";
                    break;
                }

                let { PrazoEntrega, Valor, MsgErro, } = resultCalc;
                let update = {
                  $set: {
                    UF, zipStart, zipEnd, servicoEntrega: servico, prazoEntrega: Number(PrazoEntrega), weithEnd: weith, valor: Valor, createdAt: new Date(), msgErro: MsgErro
                  }
                };

                let filter = { prazoEntrega: Number(PrazoEntrega), zipStart, zipEnd, servicoEntrega: servico, UF, valor: Valor, weithEnd: weith }

                await freightColl.updateOne(filter, update, { upsert: true });

              }

            } catch (err) {
              err
            }

          }
        }
        bar1.increment(1)
      }
    } 
    bar1.stop();

  } catch (err) {
    err
    bar1.stop();
  }

};
module.exports = { updatePriceFreight, calcFreight, correiosURL, clientSoap, prepareTags, genTagDigit }