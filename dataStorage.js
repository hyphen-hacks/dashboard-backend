const nlp = require('compromise')
const moment = require('moment')


function dataStorage() {
  this.cleanText = (input) => {
    return nlp(input.toLowerCase()).normalize().out('text')
  }
  this.store = {
    data: {},
    indexes: {},
    meta: {}
  }
  this.getJSON = () => {
    return this.store
  }
  this.loadJSON = (json) => {
    this.store = json
  }
  this.getStore = function () {
    return this.store.data
  }
  this.setMeta = (input) => {
    input.path = this.cleanText(input.path)
    this.store.meta[input.path] = input.value
  }
  this.getMeta = input => {
    input.path = this.cleanText(input.path)
    return this.store.meta[input.path]
  }
  this.singleStat = {
    init: (input) => {
      input.path = this.cleanText(input.path)
      this.store.data[input.path] = 0
      this.store.indexes[input.path] = {
        type: 'singleStat',
        name: input.path
      }
    },
    increment: (input) => {
      input.path = this.cleanText(input.path)
      if (this.store.indexes[input.path]) {
        if (this.store.indexes[input.path].type === 'singleStat') {
          this.store.data[input.path]++
          return this.store.data[input.path]
        }

      } else {
        throw'Index Not Defined: ' + input.path
      }

    },
    get: input => {
      input.path = this.cleanText(input.path)
      return this.store.data[input.path]
    }
  }
  this.multiTextStat = {
    init: (input) => {
      input.path = this.cleanText(input.path)
      this.store.data[input.path] = {}
      this.store.indexes[input.path] = {
        type: 'multiTextStat',
        name: input.path
      }
    },
    increment: (input) => {
      input.path = this.cleanText(input.path)

      let items = input.value.split('|')
      items.forEach(i => {
        i = this.cleanText(i)
        if (this.store.data[input.path][i]) {
          this.store.data[input.path][i]++
        } else {
          this.store.data[input.path][i] = 1
        }
      })
    },
    get: input => {
      input.path = this.cleanText(input.path)
      return this.store.data[input.path]
    },
    toChart: input => {
      input.path = this.cleanText(input.path)
      let data = []
      Object.keys(this.store.data[input.path]).forEach(i => {
        data.push(this.store.data[input.path][i])
      })
      return {
        data: data,
        labels: Object.keys(this.store.data[input.path])
      }

    }
  }
  this.textStat = {
    init: (input) => {
      input.path = this.cleanText(input.path)
      this.store.data[input.path] = {}
      this.store.indexes[input.path] = {
        type: 'textStat',
        name: input.path
      }
    },
    increment: (input) => {
      input.path = this.cleanText(input.path)
      input.value = this.cleanText(input.value)
      if (this.store.indexes[input.path].type === 'textStat') {
        if (this.store.data[input.path][input.value] === undefined) {
          //  console.log('creating new person')
          this.store.data[input.path][input.value] = 1
          return this.store.data[input.path][input.value]
        } else {
          // console.log('using person', store.data[input.path][input.value])
          this.store.data[input.path][input.value]++
          return this.store.data[input.path][input.value]
        }

      }
    },
    get: input => {
      input.path = this.cleanText(input.path)
      if (input.value) {
        input.value = this.cleanText(input.value)
        return this.store.data[input.path][input.value]
      } else {
        return this.store.data[input.path]
      }

    },
    toChart: input => {
      input.path = this.cleanText(input.path)
      let data = []
      Object.keys(this.store.data[input.path]).forEach(i => {
        data.push(this.store.data[input.path][i])
      })
      return {
        data: data,
        labels: Object.keys(this.store.data[input.path])
      }

    }
  }
  this.list = {
    init: (input) => {
      input.path = this.cleanText(input.path)
      this.store.data[input.path] = []
      this.store.indexes[input.path] = {
        type: 'list',
        name: input.path
      }
    },
    add: (input) => {
      input.path = this.cleanText(input.path)
      if (input.filter) {
        if (this.cleanText(input.value) !== input.filter) {
          this.store.data[input.path].push(this.cleanText(input.value))
        }
      } else {
        this.store.data[input.path].push(this.cleanText(input.value))
      }

    },
    get: input => {
      input.path = this.cleanText(input.path)
      return this.store.data[input.path]
    }
  }
  this.dateStat = {
    init: (input) => {
      input.path = this.cleanText(input.path)
      this.store.data[input.path] = {
        data: [],
        start: 10000202020202022020,
        end: 0,
        counter: 0
      }
      this.store.indexes[input.path] = {
        type: 'dateStat',
        name: input.path
      }
    },
    add: (input) => {
      input.path = this.cleanText(input.path);
      //console.log(input.value)
      const unix = moment(input.value).unix()
      if (unix < this.store.data[input.path].start) {
        this.store.data[input.path].start = unix
      }
      if (unix > this.store.data[input.path].end) {
        this.store.data[input.path].end = unix
      }
      //this.store.data[input.path].data.push({unix: unix - 1, count: this.store.data[input.path].counter, time: input.value})
      this.store.data[input.path].counter++
      this.store.data[input.path].data.push({unix: unix, count: this.store.data[input.path].counter, time: input.value})

    },
    get: input => {
      input.path = this.cleanText(input.path)
      return this.store.data[input.path]
    },
    toChart: input => {
      input.path = this.cleanText(input.path)
      let data = []
      let labels = []
      let currentDay = this.store.data[input.path].start
      let dayCounter = 0
      /*while (moment(currentDay).isSameOrBefore(this.store.data[input.path].end)) {
        // code block to be executed
        dayCounter ++
        currentDay = moment(currentDay).add(1, 'd').unix()
      }
      console.log(dayCounter)
      */

      this.store.data[input.path].data.forEach(i => {
        data.push({x: i.unix, y: i.count})

        labels.push(moment(i.time).format('MMM D'))
        // data.push(i.count)
      })
      return {
        data: data,
        labels: labels,
        end: this.store.data[input.path].end,
        start: this.store.data[input.path].start
      }

    }
  }


}

module.exports = dataStorage