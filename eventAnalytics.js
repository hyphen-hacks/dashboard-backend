const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment-timezone')
const endPoint = 'https://api.sendgrid.com/v3/contactdb/recipients'
const cron = require('node-cron')
let requestBody = []
let emails = []

admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});

const db = admin.firestore();
const peopleRef = db.collection('people');

function run() {
  const timeStamp = moment().tz("America/Los_Angeles").unix();
  let analyticsResult = {
    timeStamp: timeStamp,
    attendees: {
      total: 0,
      onCampus: 0,
      waiversComplete: 0,
      checkedIn: 0,
    },
    volunteers: {
      total: 0,
      onCampus: 0,
      waiversComplete: 0,
      checkedIn: 0,
    },
    mentors: {
      total: 0,
      onCampus: 0,
      waiversComplete: 0,
      checkedIn: 0,
    },
    unknown: {
      total: 0,
      onCampus: 0,
      waiversComplete: 0,
      checkedIn: 0,
    }
  }
  peopleRef.get().then(snap => {
    snap.forEach(person => {
      const personData = person.data()
      let personType = ''
      if (personData.ticket_class_name === 'High school Student') {
        personType = 'attendees'
      } else if (personData.ticket_class_name === 'volunteer') {
        personType = 'volunteers'
      } else if (personData.ticket_class_name === "Mentor/Judge") {
        personType = 'mentors'
      } else {
        personType = 'unknown'
      }
      analyticsResult[personType].total++
      if (personData.waiverStatus === 2) {
        analyticsResult[personType].waiversComplete++
      }
      if (personData.checkedIn === true) {
        analyticsResult[personType].checkedIn++

      }
      if (personData.onCampus === true) {
        analyticsResult[personType].onCampus++
      }
    })
    console.log(`processed analytics on ${moment(analyticsResult.timeStamp).tz('America/Los_Angeles').format('dddd, MMMM Do YYYY, h:mm:ss a')}`)
    console.log(analyticsResult.timeStamp)
    db.collection('eventAnalytics').doc(String(analyticsResult.timeStamp)).set(analyticsResult).then(i => {
      if (i.error) {
        console.log(i.error)
      } else {
        console.log('uploaded')
      }
    })
  })
}

run()
cron.schedule("* * * * *", () => {
  console.log("running a task every minute");

  run()
});