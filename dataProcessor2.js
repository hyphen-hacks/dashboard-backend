const dataStorage = require('./dataStorage.js')
const cron = require('node-cron');
const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment-timezone');
const nlp = require('compromise')
//const roster = require('./private/roster.json')

admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});
const startTime = moment().tz("America/Los_Angeles").format('MMM Do, HH:mm:ss')
const nodeVersion = process.version
console.log(`Hyphen-Hacks Data Processor v2 API Init ${startTime} Node ${nodeVersion}`)

function processData() {
  console.log('Loading Data', moment().tz("America/Los_Angeles").format('MMMM Do YYYY, h:mm:ss a'))
  let DS = new dataStorage()
  DS.singleStat.init({path: 'totalPeople'})
  DS.singleStat.init({path: 'attendees'})
  DS.singleStat.init({path: 'mentors'})
  DS.singleStat.init({path: 'volunteers'})
  DS.singleStat.init({path: 'attendeesWithTeam'})
  DS.singleStat.init({path: 'attendeesWithOutTeam'})
  DS.singleStat.init({path: 'attendeesWithAcceptedWaivers'})
  DS.singleStat.init({path: 'mentorsWithAcceptedWaivers'})
  DS.singleStat.init({path: 'volunteersWithAcceptedWaivers'})
  DS.singleStat.init({path: 'attendeesWithSubmittedWaivers'})
  DS.singleStat.init({path: 'mentorsWithSubmittedWaivers'})
  DS.singleStat.init({path: 'volunteersWithSubmittedWaivers'})
  DS.singleStat.init({path: 'volunteersWithDeclinedWaivers'})
  DS.singleStat.init({path: 'attendeesWithDeclinedWaivers'})
  DS.singleStat.init({path: 'mentorsWithDeclinedWaivers'})
  DS.textStat.init({path: 'attendeeGenderDistribution'})
  DS.textStat.init({path: 'attendeeRaceDistribution'})
  DS.textStat.init({path: 'schools'})
  DS.textStat.init({path: 'shirtSizeDistribution'})
  DS.textStat.init({path: 'foodAllergies'})
  DS.textStat.init({path: 'graduationDistribution'})
  DS.textStat.init({path: 'dietaryRestrictions'})
  DS.textStat.init({path: 'attendeeTeamCodingExperience'})
  DS.textStat.init({path: 'attendeeHackathonExperience'})
  DS.textStat.init({path: 'attendeeHardwareExperience'})
  DS.textStat.init({path: 'attendeeSoftwareExperience'})
  DS.textStat.init({path: 'laptops'})
  DS.multiTextStat.init({path: 'referrers'})
  DS.list.init({path: 'whyAreAttendeesInterested'})
  DS.list.init({path: 'attendeeDescriptionOfCodingExperience'})
  DS.list.init({path: 'specialNeeds'})
  DS.list.init({path: 'attendeeBirthDays'})
  DS.list.init({path: 'attendeesSignedUp'})
  admin.firestore().collection('people').get().then(snap => {
    const timeFetched = moment().tz("America/Los_Angeles")
    DS.setMeta({path: 'timeStamp', value: timeFetched})
    console.log('downloaded Data', timeFetched.format('MMMM Do YYYY, h:mm:ss a'))
    snap.forEach(i => {
      const person = i.data()
      if (!person.testApplicant) {
        DS.singleStat.increment({path: 'totalPeople'})
        let role = ''
        if (person.ticket_class_name === 'High school Student') {
          role = 'attendee'

          DS.singleStat.increment({path: 'attendees'})
          DS.list.add({path: 'attendeeBirthDays', value: person.profile.birth_date})
          DS.list.add({path: 'attendeesSignedUp', value: person.created})
          DS.textStat.increment({path: 'graduationDistribution', value: person.answers[0].answer})
          DS.multiTextStat.increment({path: 'schools', value: person.answers[1].answer})
          DS.multiTextStat.increment({path: 'referrers', value: person.answers[23].answer})
          DS.textStat.increment({path: 'shirtSizeDistribution', value: person.answers[2].answer})
          DS.textStat.increment({path: 'attendeeRaceDistribution', value: person.answers[3].answer})
          DS.textStat.increment({path: 'attendeeGenderDistribution', value: person.answers[4].answer})
          DS.textStat.increment({path: 'attendeeSoftwareExperience', value: person.answers[9].answer})
          DS.textStat.increment({path: 'attendeeHardwareExperience', value: person.answers[10].answer})
          DS.textStat.increment({path: 'attendeeHackathonExperience', value: person.answers[11].answer})
          DS.textStat.increment({path: 'attendeeTeamCodingExperience', value: person.answers[12].answer})
          DS.list.add({path: 'whyAreAttendeesInterested', value: person.answers[8].answer})
          DS.list.add({path: 'attendeeDescriptionOfCodingExperience', value: person.answers[13].answer})
          if (person.answers[22].answer.toLowerCase() === "yes") {
            DS.singleStat.increment({path: 'attendeesWithTeam'})

          } else {
            DS.singleStat.increment({path: 'attendeesWithOutTeam'})
          }
        } else if (person.ticket_class_name === 'Mentor/Judge') {
          role = 'mentor'
          DS.singleStat.increment({path: 'mentors'})
        } else {
          DS.singleStat.increment({path: 'volunteers'})
          role = 'volunteer'
        }
        DS.textStat.increment({path: 'foodAllergies', value: person.answers[5].answer})
        DS.textStat.increment({path: 'dietaryRestrictions', value: person.answers[6].answer})
        if (person.answers[7].answer) {
          DS.list.add({path: 'specialNeeds', value: person.answers[7].answer, filter: 'none'})
        }
        DS.textStat.increment({path: 'laptops', value: person.answers[21].answer})
        if (person.waiverStatus === 1) {
          DS.singleStat.increment({path: `${role}sWithSubmittedWaivers`})
        } else if (person.waiverStatus === 2) {
          DS.singleStat.increment({path: `${role}sWithAcceptedWaivers`})
        }
        if (person.waiverStatus === 3) {
          DS.singleStat.increment({path: `${role}sWithDeclinedWaivers`})
        }

      }

    })
    fs.writeFile('./private/analyticsDatabase.json', JSON.stringify(DS.getJSON()), (e) => {
      if (e) {
        console.log(e)
      }
      console.log('writen')
    })
  })


}

cron.schedule('*/30 * * * *', () => {
  console.log('running a task every half hour');
  processData()

});
processData()