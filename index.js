const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});
const db = admin.firestore();
let eventbriteData = []

function getEventbriteAttendees(url) {
  return new Promise(
    function (resolve, reject) {
      console.log('fetching ' + url)
      fetch(url, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + keys.eventbriteAPIKey,
        }
      }).then((resp) => resp.json()).then(data => {
        //console.log(data)
        const cleanedAttendees = data.attendees.map(i => {
          const b = {
            "resource_uri": i.resource_uri,
            "id": i.id,
            "changed": i.changed,
            "created": i.created,
            "quantity": i.quantity,
            "variant_id": i.variant_id,
            "profile": i.profile,
            gender: i.gender,
            age: i.age,
            "birth_date": i.birth_date,
            "email": i.email,
            "name": i.name,
            answers: i.answers,
            "ticket_class_name": i.ticket_class_name,
            "event_id": i.event_id,
            "order_id": i.order_id,
            "ticket_class_id": i.ticket_class_id
          }
          eventbriteData.push(b)
          return b
        })
        if (data.pagination.has_more_items) {
          getEventbriteAttendees(`${keys.eventbriteURL}?continuation=${data.pagination.continuation}`)
        }
        resolve(cleanedAttendees)
      })
      .catch(function (e) {
        console.log(e)
      });
    }
  )
}

getEventbriteAttendees(keys.eventbriteURL).then((e) => {
  console.log(eventbriteData)
  fs.writeFile('./private/sample-api-return.json', JSON.stringify(eventbriteData), ()=> {

  })
})
