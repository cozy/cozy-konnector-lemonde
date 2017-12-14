'use strict'

// This is a default simple connector made to show you some common libs which can be used
// This connector fetches some cat images from the qwant api (which is more open than the google one)
const {BaseKonnector, request, saveFiles} = require('cozy-konnector-libs')

const baseUrl = 'http://abonnes.lemonde.fr'

let rq = request({
  // debug: true,
  jar: true,
  json: false,
  cheerio: true
})
module.exports = new BaseKonnector(fields => {
  return rq({
    uri: 'https://secure.lemonde.fr/sfuser/connexion'
  })
  .then($ => {
    const token = $('#connection__token').val()
    return rq({
      method: 'POST',
      uri: 'https://secure.lemonde.fr/sfuser/connexion',
      form: {
        'connection[mail]': fields.login,
        'connection[password]': fields.password,
        'connection[stay_connected]': 1,
        'connection[save]': '',
        'connection[_token]': token
      }
    })
  })
  .then(() => {
    // get user id
    rq = request({cheerio: false})
    return rq('http://www.lemonde.fr/sfuser/sfws/auth/user/?callback=lmdcb0')
    .then(body => {
      const record = JSON.parse(body.match(/\((.*)\)/)[1])
      return record.id
    })
  })
  .then(id => {
    return rq(`http://www.lemonde.fr/sfuser/sfws/user/${id}/classeur/edito/0/1000000?callback=lmdcb1`)
    .then(body => {
      const record = JSON.parse(body.match(/\((.*)\)/)[1])
      let result = []
      for (let key in record.articles) {
        result = result.concat(record.articles[key].articles)
      }
      return result.map(article => ({
        fileurl: `${baseUrl}${article.url}`
      }))
    })
  })
  .then(entries => saveFiles(entries, fields, {
    timeout: Date.now() + 60 * 1000 // in one minute
  }))
})
