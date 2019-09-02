const DataStorage = require('./dataStorage.js')
let dataStorage = new DataStorage()

dataStorage.singleStat.init({path: 'people'})
dataStorage.textStat.init({path: 'attendeeGenderDistribution.test'})
dataStorage.list.init({path: 'attendeesReasonsForJoining'})
dataStorage.singleStat.increment({path: 'people'})
dataStorage.singleStat.increment({path: 'people'})
dataStorage.textStat.increment({path: 'attendeeGenderDistribution.test', value: 'female'})
dataStorage.textStat.increment({path: 'attendeeGenderDistribution.test', value: 'female'})
dataStorage.textStat.increment({path: 'attendeeGenderDistribution.test', value: 'male'})
dataStorage.list.add({path: 'attendeesReasonsForJoining', text: 'testing'})
console.log(dataStorage.getStore())

