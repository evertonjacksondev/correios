const {
  isValidCPF,
  validateEmail
} = require('../util/form');
const {
  sendMail
} = require('../util/mail');
const {
  decode,
  encode
} = require('./../util/base64');
const jwt = require('jsonwebtoken');
const azure = require('azure-storage');
const {
  ObjectId
} = require('mongodb');
const {
  uploadFile, uploadFileS3
} = require('../util/storage');
const {
  googleAuth
} = require('../util/GoogleAuth');




const getUserData = async (document, sellerId, db, checkSellerId = false, checkAdmin = false) => {
  let userCollection = db.collection('user');
  let user = await userCollection.findOne({
    document,
    active: true
  });


  user.sellerIds = [];
  if (user.super) {

    let sellerCollection = db.collection('seller');
    let seller = await sellerCollection.find({}).toArray();
    user.sellerIds = seller.map(m => {
      return m._id
    });

  } else {

    let userXSellerCollection = db.collection('userXSeller');
    let userXSellers = await userXSellerCollection.find({
      'userId': user._id
    }).toArray();
    user.sellerIds = (userXSellers).map(m => {
      return m.sellerId
    });

  }


  if (user.sellerIds.length > 1 && (!sellerId && checkSellerId)) throw 'User has more than 1 seller, put sellerId on Header';
  // if (user.sellerIds.length == 0) throw 'User has not sellerIds to show';
  if (checkSellerId && !user.sellerIds.find(f => f.equals(sellerId))) throw `Your userToken dont have access to show sellerId ${headers.sellerid}`;
  if (checkAdmin && !userXSellers.find(f => f.sellerId.equals(sellerId) && f.admin)) throw 'O usuário não é administrador desta empresa'

  return user;
}

const getUserByToken = async (headers, db, checkSellerId = false, checkAdmin = false, sellerId = undefined) => {

  if (!headers.usertoken) throw 'Header > userToken Needed!';

  // token do integrador (sem expiraçao nem login)
  headers.usertoken = headers.usertoken.replace('Bearer ', '').replace('bearer ', '').replace('BEARER ', '');
  let document;

  try {
    document = JSON.parse(decode(headers.usertoken)).document;
    let user = await getUserData(document, sellerId ? sellerId : headers.sellerid, db, checkSellerId, checkAdmin);
    if (!user) throw `User by userToken ${headers.usertoken} not found!`;
    return user;
  } catch (err) {
    //jwt verify -- extrai o email do jwt
    let secretKey = 'TokenDeValidação';
    try {
      let decoded = await jwt.verify(headers.usertoken, secretKey);
      document = decoded.document;
    } catch (error) {
      throw {
        message: "Sessão encerrada, favor recarregar a página e fazer login novamente",
        auth: true,
        // error
      }
    }

  }

  return (await getUserData(document, sellerId ? sellerId : headers.sellerid, db, checkSellerId, checkAdmin))
};

const checkSellerByUserToken = (user, sellerId) => {
  if (!user.sellerIds.find(f => f.equals(sellerId)))
    throw `Your userToken dont have access to show sellerId ${sellerId}`;
};

const checkConfirmationToken = async (db, mail, token, type = 'normal') => {
  let userCollection = db.collection('user');

  let user = await userCollection.findOne({
    mail,
    token
  });

  if (type == 'normal' && !process.argv.find(f => f == 'hom')) {
    if (!user) throw 'Código de Autenticação inválido!';

    let validToken = ((new Date().getTime() - user.tokenDate.getTime()) / 1000) < 600;

    if (!validToken) throw 'Token expirado!';
    if (!user) throw 'Código de Verificação inválido';
  }


}

const generateConfirmationToken = async (db, data) => {
  let userCollection = db.collection('user');

  if (!data.mail) throw 'Email Obrigatório.';
  if (!validateEmail(data.mail)) throw 'Invalid Mail.';

  let token = Math.floor(1000 + Math.random() * 9000).toString();

  let setData = {
    mail: data.mail,
    tokenDate: new Date(),
    token
  };

  if (data.newMail) setData.newMail = data.newMail;

  await userCollection.updateOne({
    mail: data.mail
  }, {
    $set: setData
  }, {
    upsert: true
  });

  await sendMail(
    data.newMail ? data.newMail : data.mail,
    'Codigo de Autorização Digigrow Hub',
    '<b>Código de Autenticação:</b> ' + token
  );
}

const register = async (db, userBody) => {



  let userColl = db.collection('user');
  let userXSellerColl = db.collection('userXSeller');
  let selectUser = await userColl.findOne({
    $or: [{
      mail: userBody.mail
    }, {
      document: userBody.document
    }],
    active: true
  });


  if (userBody.type == 'outMail') {
    let invitedMail = await userXSellerColl.find({ userMail: userBody.mail }).toArray();
    if (invitedMail.length < 1) throw 'Email do convidado não encontrado'
  }
  if (selectUser) throw 'E-mail ou CPF já cadastrado.'

  if (selectUser) throw 'E-mail ou CPF já cadastrado.'
  if (!userBody.phone) throw 'Telefone Obrigatório.';
  if (!userBody.document) throw 'CPF obrigatório.';
  if (!userBody.mail) {
    userBody.mail = userBody.userEmail
  } else if (!userBody.mail) {
    throw 'Invalid mail!'
  }
  if (!userBody.name) throw 'Nome obrigatório.';
  if (!isValidCPF(userBody.document)) throw 'CPF inválido.';
  try {
    if (userBody.phone.match(/\d/g).join('').length < 10) throw "Telefone Inválido."
  } catch (err) {
    throw "Telefone Inválido."
  }
  if (!userBody.password) throw 'Senha obrigatória.';
  if ((!userBody.code) && (userBody.type === 'normal')) throw 'Código de Verificação obrigatório';
  if (!validateEmail(userBody.mail)) throw 'Invalid Mail.';


  if (!userBody.google) {
    await checkConfirmationToken(db, userBody.mail, userBody.code, userBody.type);
  }

  let {
    password
  } = userBody;

  delete userBody.password;
  delete userBody.passwordConfirm;
  delete userBody.code;

  userBody.userToken = encode(JSON.stringify(userBody));

  let user = await userColl.findOneAndUpdate({
    mail: userBody.mail
  }, {
    $set: {
      ...userBody,
      password,
      active: true,
      super: false,
      createdAt: new Date(),
      picture: userBody.picture
    }
  }, {
    upsert: true
  });



  await userXSellerColl.updateOne({
    userMail: userBody.mail
  }, {
    $set: {
      userId: user.lastErrorObject.upserted
    }
  });


  userBody._id = user.lastErrorObject.upserted;




  return userBody;
};

const resetPassword = async (db, userBody) => {
  await checkConfirmationToken(db, userBody.mail, userBody.code);

  let userColl = db.collection('user');


  let checkUser = await userColl.find({ mail: userBody.mail, active: true }).toArray();

  if (checkUser.length < 1) throw 'E-mail não encontrado'

  await userColl.updateOne({
    mail: userBody.mail,
    active: true
  }, {
    $set: {
      password: userBody.password
    }
  });
}

const changePassword = async (db, userBody, userId) => {
  // faz um find no mongo usando userId e a senha antiga
  let userColl = db.collection('user');

  let user = await userColl.findOne({
    _id: new ObjectId(userId),
    password: userBody.passwordOld,
    active: true
  });

  if (!user) throw 'Senha inválida!';

  await userColl.updateOne({
    _id: new ObjectId(userId),
    active: true
  }, {
    $set: {
      password: userBody.password
    }
  });
}

const resetMail = async (db, userBody) => {
  await checkConfirmationToken(db, userBody.mail, userBody.code);

  let userColl = db.collection('user');
  await userColl.updateOne({
    mail: userBody.mail,
    active: true
  }, {
    $set: {
      mail: userBody.newMail
    },
    $unset: {
      newMail: 1
    }
  }

  );
}

const login = async (db, mail, password, googleToken) => {
  let userFilter = {};

  if (googleToken) {
    let checkedGoogleUser = await googleAuth(googleToken)
    if (checkedGoogleUser && checkedGoogleUser.payload.email_verified) {
      userFilter.mail = checkedGoogleUser.payload.email;
    }
  } else {
    if (!mail) throw 'Mail required.';
    if (!password) throw 'Password required.';

    userFilter.mail = mail;
    userFilter.password = password;
  }

  if (!validateEmail(userFilter.mail)) throw 'Invalid Mail.';

  let userCollection = db.collection('user');
  let user = await userCollection.findOne(userFilter);

  if (!user && !googleToken) throw `Usuário ou senha inválidos.`;
  if (!user && googleToken) throw `Este email ainda não foi cadastrado, por favor crie uma nova conta.`;

  delete user.password;
  delete user.userToken;

  let secretKey = 'TokenDeValidação';

  // sign jwt
  user.userToken = jwt.sign({
    document: user.document
  }, secretKey, {
    expiresIn: '24h' // expires in 5min
  });


  let userXSellerColl = db.collection('userXSeller');
  let appMenuXUserColl = db.collection('appMenuXUser');
  let appMenuColl = db.collection('appMenu');

  let userAdmin = await userXSellerColl.findOne({
    userId: user._id,
    admin: true
  });

  let appMenu;
  if (userAdmin) {
    appMenu = await appMenuColl.find({}).toArray();
  } else {
    let appMenuXUser = await appMenuXUserColl.findOne({
      userId: user._id
    });
    if (appMenuXUser)
      appMenu = await appMenuColl.find({
        key: {
          $in: appMenuXUser.appMenu
        }
      }).toArray();
  }


  let links = [];

  appMenu && appMenu.map(m => {
    if (m.link)
      links.push(m.link);

    if (m.child)
      links.push(...m.child.map(m2 => {
        if (m2.link) return m2.link
      }))
  });

  user.links = links.length == 0 ? ['/', '/seller', '/settings'] : links;

  let hasSellers = (await userXSellerColl.count({
    userId: user._id
  })) > 0;

  user['hasSellers'] = hasSellers;

  return user;
}

const updateUserPic = async (db, userId, image, type) => {
  let fileName = `userPic-${userId}.jpg`;

  let picPath = await uploadFileS3(image, fileName);

  userColl = db.collection('user');
  await userColl.updateOne({
    _id: new ObjectId(userId)
  }, {
    $set: {
      picture: picPath
    }
  });

  return picPath;
}

const updateSellerPic = async (db, sellerId, image, type) => {
  let fileName = `sellerCpf-${sellerId}-{cpf}.jpg`;

  let picPath = await uploadFileS3(image, fileName);

  sellerColl = db.collection('seller');
  await sellerColl.updateOne({
    _id: new ObjectId(sellerId)
  }, {
    $set: {
      picture: picPath
    }
  });

  return picPath;
}

const updateSellerPicCNPJ = async (db, sellerId, image, type) => {
  let fileName = `sellerCpf-${sellerId}-{cnpj}.jpg`;

  let picPath = await uploadFileS3(image, fileName);

  sellerColl = db.collection('seller');
  await sellerColl.updateOne({
    _id: new ObjectId(sellerId)
  }, {
    $set: {
      pictureCNPJ: picPath
    }
  });

  return picPath;
}


module.exports = {
  getUserByToken,
  checkSellerByUserToken,
  register,
  generateConfirmationToken,
  resetPassword,
  login,
  updateUserPic,
  resetMail,
  changePassword,
  updateSellerPic,
  updateSellerPicCNPJ
};