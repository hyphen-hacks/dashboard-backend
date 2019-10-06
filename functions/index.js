const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment-timezone')
const dataStorage = require('./dataStorage.js')
admin.initializeApp();
exports.analytics = functions.firestore
.document('people/{id}')
.onWrite(async (change, context) => {
  const db = admin.firestore();
  const timeStamp = moment().tz("America/Los_Angeles").unix();
  db.collection('secrets').doc('changelog').set({
    lastChanged: {
      unix: timeStamp,
      english: moment(timeStamp).tz('America/Los_Angeles').format('dddd, MMMM Do YYYY, h:mm:ss a')
    }

  })
  db.collection('secrets').doc('changelog').collection('changes').add({
    changed: {
      unix: timeStamp,
      english: moment(timeStamp).tz('America/Los_Angeles').format('dddd, MMMM Do YYYY, h:mm:ss a')
    },
    person: context.params.id,
  })
  console.log(context, change)
  const peopleRef = db.collection('people');

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
  let snap;
  await peopleRef.get().then(i => snap = i)
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
  return db.collection('eventAnalytics').doc(String(analyticsResult.timeStamp)).set(analyticsResult)

  /*.then(i => {
    if (i.error) {
      console.log(i.error)
      return false
    } else {
      console.log('uploaded')
      return 'uploaded'
    }
  })


   */

});
