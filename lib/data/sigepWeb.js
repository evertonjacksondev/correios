const soap = require('soap');


const correiosURL = (type) => {
  return type == 'cep' ?
    `https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente?wsdl` :
    "http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx?wsdl"
}

const clientSoap = async (env) => {
  const url = correiosURL(env)
  return await soap.createClientAsync(url)
}

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
}

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
}

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
    if (nCdFormato) filterCalc['nCdFormato'] = nCdFormato;
    if (nVlComprimento) filterCalc['nVlComprimento'] = nVlComprimento;
    if (nVlAltura) filterCalc['nVlAltura'] = nVlAltura;
    if (nVlLargura) filterCalc['nVlLargura'] = nVlLargura;
    if (nVlDiametro) filterCalc['nVlDiametro'] = nVlDiametro;
    if (sCdMaoPropria) filterCalc['sCdMaoPropria'] = sCdMaoPropria;
    if (nVlValorDeclarado) filterCalc['nVlValorDeclarado'] = nVlValorDeclarado;
    if (sCdAvisoRecebimento) filterCalc['sCdAvisoRecebimento'] = sCdAvisoRecebimento;

    let result = (await client.CalcPrecoPrazoAsync(filterCalc))[0].CalcPrecoPrazoResult.Servicos.cServico[0]

    return result;

  } catch (err) {
    err
  }

}
module.exports = { calcFreight, correiosURL, clientSoap, prepareTags, genTagDigit }