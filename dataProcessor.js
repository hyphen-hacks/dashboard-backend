const cron = require('node-cron');
const keys = require('./private/api-keys.json')
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const fs = require('fs')
const moment = require('moment')
const nlp = require('compromise')

admin.initializeApp({
  credential: admin.credential.cert(keys.firebase),
  databaseURL: "https://hyphen-hacks-2019.firebaseio.com"
});
const startTime = moment().format('MMM Do, HH:mm:ss')
console.log(`Hyphen-Hacks Data Processor API Init ${startTime}`)

function Person(i, time) {
  if (i.ticket_class_name === 'High school Student') {
    this.role = 'attendee'
    this.school = nlp(i.answers[1].answer.toLowerCase()).normalize().out('text')
    this.gender = i.answers[4].answer
    this.race = i.answers[3].answer
    this.graduationYear = i.answers[0].answer
    this.whyAreYouInterested = i.answers[8].answer
    this.howMuchExperienceDoYouHaveWithDev = i.answers[9].answer
    this.howMuchExperienceDoYouHaveWithHard = i.answers[10].answer
    this.howMuchExperienceDoYouHaveWithHackathons = i.answers[11].answer
    this.howMuchExperienceDoYouHaveWithCodingInTeams = i.answers[12].answer
    this.descOfCodingExperience = i.answers[13].answer
    this.team = i.answers[22].answer
  } else if (i.ticket_class_name === 'Mentor/Judge') {
    this.role = 'mentor'
  } else {
    this.role = 'volunteer'
  }
  this.borrowLaptop = i.answers[21].answer
  this.shirtSize = i.answers[2].answer
  this.waiverCompleted = i.waiverStatus === 2;
  this.waiverSubmitted = i.waiverStatus === 1;
  this.waiverDeclined = i.waiverStatus === 3;
  this.foodAllergies = i.answers[5].answer
  this.dietaryRestrictions = i.answers[6].answer

  this.refferer = []

  let refferers = i.answers[23].answer.split('|')
  refferers.forEach(i => {
    this.refferer.push(nlp(i.toLowerCase()).normalize().out('text'))
  })


  if (i.answers[7].answer !== 'none' && i.answers[7].answer !== 'None') {
    this.specialNeeds = i.answers[7].answer
  }

  this.timestamp = time
}

function process() {
  console.log('processing')
  let results = []
  let data = {
    totalPeople: 0,
    attendees: 0,
    mentors: 0,
    volunteers: 0,
    genderDistribution: {
      attendees: {}
    },
    raceDistribution: {
      attendees: {},
      mentors: {},
      volunteers: {}
    },
    shortAnswers: {
      attendees: {
        whyAreYouInterested: [],
        howMuchExperienceDoYouHaveWithDev: {},
        howMuchExperienceDoYouHaveWithHard: {},
        howMuchExperienceDoYouHaveWithHackathons: {},
        howMuchExperienceDoYouHaveWithCodingInTeams: {},
        descOfCodingExperience: [],
        team: {}
      }
    },
    borrowLaptop: {},
    specialNeeds: [],
    dietaryRestrictions: {},
    graduationDistribution: {},
    foodAllergies: {},
    shirtSizeDistribution: {},
    waiverStats: {
      accepted: {
        attendees: 0,
        mentors: 0,
        volunteers: 0
      },
      submitted: {
        attendees: 0,
        mentors: 0,
        volunteers: 0
      },
      declined: {
        attendees: 0,
        mentors: 0,
        volunteers: 0
      }

    },
    schools: {},
    refferer: {}
  }
  admin.firestore().collection('people').get().then(snap => {
      const timeFetched = moment()
      snap.forEach(i => {
        const person = i.data()
        if (person.testApplicant !== true) {
          let cleanedPerson = new Person(person, timeFetched)
          // console.log(cleanedPerson)
          data.totalPeople++

          if (cleanedPerson.role === 'mentor') {
            data.mentors++
          }
          if (cleanedPerson.role === 'attendee') {
            data.attendees++
            // console.log(cleanedPerson.school)
            if (data.schools[cleanedPerson.school]) {
              data.schools[cleanedPerson.school]++
            } else {
              data.schools[cleanedPerson.school] = 1
            }
            if (data.graduationDistribution[cleanedPerson.graduationYear]) {
              data.graduationDistribution[cleanedPerson.graduationYear]++
            } else {
              data.graduationDistribution[cleanedPerson.graduationYear] = 1
            }
            if (data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithDev[cleanedPerson.howMuchExperienceDoYouHaveWithDev]) {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithDev[cleanedPerson.howMuchExperienceDoYouHaveWithDev]++
            } else {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithDev[cleanedPerson.howMuchExperienceDoYouHaveWithDev] = 1
            }
            if (data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHard[cleanedPerson.howMuchExperienceDoYouHaveWithHard]) {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHard[cleanedPerson.howMuchExperienceDoYouHaveWithHard]++
            } else {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHard[cleanedPerson.howMuchExperienceDoYouHaveWithHard] = 1
            }
            if (data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithCodingInTeams[cleanedPerson.howMuchExperienceDoYouHaveWithCodingInTeams]) {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithCodingInTeams[cleanedPerson.howMuchExperienceDoYouHaveWithCodingInTeams]++
            } else {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithCodingInTeams[cleanedPerson.howMuchExperienceDoYouHaveWithCodingInTeams] = 1
            }
            if (data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHackathons[cleanedPerson.howMuchExperienceDoYouHaveWithHackathons]) {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHackathons[cleanedPerson.howMuchExperienceDoYouHaveWithHackathons]++
            } else {
              data.shortAnswers.attendees.howMuchExperienceDoYouHaveWithHackathons[cleanedPerson.howMuchExperienceDoYouHaveWithHackathons] = 1
            }
            if (data.shortAnswers.attendees.team[cleanedPerson.team]) {
              data.shortAnswers.attendees.team[cleanedPerson.team]++
            } else {
              data.shortAnswers.attendees.team[cleanedPerson.team] = 1
            }
            data.shortAnswers.attendees.whyAreYouInterested.push(cleanedPerson.whyAreYouInterested)
            data.shortAnswers.attendees.descOfCodingExperience.push(cleanedPerson.descOfCodingExperience)

          }
          if (cleanedPerson.role === 'volunteer') {
            data.volunteers++
          }
          if (cleanedPerson.waiverCompleted) {
            data.waiverStats.accepted[cleanedPerson.role + 's']++
          }
          if (cleanedPerson.waiverSubmitted) {
            data.waiverStats.submitted[cleanedPerson.role + 's']++
          }
          if (cleanedPerson.waiverDeclined) {
            data.waiverStats.declined[cleanedPerson.role + 's']++
          }
          if (cleanedPerson.gender) {
            if (data.genderDistribution[cleanedPerson.role + 's'][cleanedPerson.gender]) {
              data.genderDistribution[cleanedPerson.role + 's'][cleanedPerson.gender]++
            } else {
              data.genderDistribution[cleanedPerson.role + 's'][cleanedPerson.gender] = 1
            }

          }
          if (cleanedPerson.shirtSize) {
            if (data.shirtSizeDistribution[cleanedPerson.shirtSize]) {
              data.shirtSizeDistribution[cleanedPerson.shirtSize]++
            } else {
              data.shirtSizeDistribution[cleanedPerson.shirtSize] = 1
            }

          }
          if (cleanedPerson.race) {
            if (data.raceDistribution[cleanedPerson.role + 's'][cleanedPerson.race]) {
              data.raceDistribution[cleanedPerson.role + 's'][cleanedPerson.race]++
            } else {
              data.raceDistribution[cleanedPerson.role + 's'][cleanedPerson.race] = 1
            }

          }
          if (data.foodAllergies[cleanedPerson.foodAllergies]) {
            data.foodAllergies[cleanedPerson.foodAllergies]++
          } else {
            data.foodAllergies[cleanedPerson.foodAllergies] = 1
          }
          if (data.foodAllergies[cleanedPerson.foodAllergies]) {
            data.foodAllergies[cleanedPerson.foodAllergies]++
          } else {
            data.foodAllergies[cleanedPerson.foodAllergies] = 1
          }
          if (data.dietaryRestrictions[cleanedPerson.dietaryRestrictions]) {
            data.dietaryRestrictions[cleanedPerson.dietaryRestrictions]++
          } else {
            data.dietaryRestrictions[cleanedPerson.dietaryRestrictions] = 1
          }
          if (cleanedPerson.specialNeeds) {
            data.specialNeeds.push(cleanedPerson.specialNeeds)
          }
          if (data.borrowLaptop[cleanedPerson.borrowLaptop]) {
            data.borrowLaptop[cleanedPerson.borrowLaptop]++
          } else {
            data.borrowLaptop[cleanedPerson.borrowLaptop] = 1
            //  console.log(cleanedPerson.borrowLaptop)
          }


          cleanedPerson.refferer.forEach(i => {
            if (data.refferer[i]) {
              data.refferer[i]++
            } else {
              data.refferer[i] = 1
              //  console.log(cleanedPerson.borrowLaptop)
            }
          })


        }


      })
      //console.log(data)
      fs.writeFile('./private/analyticsResults.json', JSON.stringify(data), (e) => {
        if (e) {
          console.log(e)
        }
        console.log('writen')
      })

    }
  )

}

cron.schedule('* * 1 * *', () => {
  console.log('running a task every hour');
  process()

});
process()

