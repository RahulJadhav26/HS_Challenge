const got = require('got')
const dotenv = require('dotenv')
const axios = require('axios')

dotenv.config()
var url = process.env.url
var post_url = process.env.post_url

const map = new Map();
let sessionsByUser = {}

//  The solution is working for the below Test Case
var test = {
    "events": [
         {
             "url": "/pages/a-big-river",
             "visitorId": "d1177368-2310-11e8-9e2a-9b860a0d9039",
             "timestamp": 1512754583000
         },
         {
             "url": "/pages/a-small-dog",
             "visitorId": "d1177368-2310-11e8-9e2a-9b860a0d9039",
             "timestamp": 1512754631000
         },
        {
            "url": "/pages/a-big-talk",
            "visitorId": "f877b96c-9969-4abc-bbe2-54b17d030f8b",
            "timestamp": 1512709065294
        },
        {
            "url": "/pages/a-sad-story",
            "visitorId": "f877b96c-9969-4abc-bbe2-54b17d030f8b",
            "timestamp": 1512711000000
        },
        {
            "url": "/pages/a-big-river",
            "visitorId": "d1177368-2310-11e8-9e2a-9b860a0d9039",
            "timestamp": 1512754436000
        },
        {
            "url": "/pages/a-sad-story",
            "visitorId": "f877b96c-9969-4abc-bbe2-54b17d030f8b",
            "timestamp": 1512709024000
        }
    ]
}

// GET API for fetching events
axios.get(url).then((response)=>{
    var data = response.data
    // var events = test.events
    var events = data.events

    //Creating a map of {id => pages}
    events.forEach(event => {
        if (!map.has(event.visitorId)) {
            map.set(event.visitorId, new Map());
        }
        map.get(event.visitorId).set(event.timestamp, event.url);
    })
    map.forEach((url, user) => {
        // sorted the timestamps to get the start of session time
        const timestamps = Array.from(url.keys()).sort();
        // Called the function to return session details like startTime and duration
        const sessions = fetchSessions(timestamps, url);
        sessionsByUser[user] = sessions;
    })

    // Result is consoled here
    // console.log(sessionsByUser)
    

    // POST API
    axios.post(post_url,sessionsByUser).then((response) => {
        console.log(response.body);
    }).catch((error) => {
        console.error(error);
    });

}).catch((error) => {
    console.error(error);
});


    // Formating the map to desired payload
function fetchSessions(timestamps, url) {
    let start = 0;
    let sessions = []
    // Initialize
    sessions.push({
        duration: 0,
        pages: [url.get(timestamps[0])],
        startTime: timestamps[0]
    })
    for (let i = 1; i < timestamps.length; i++) {
        
        // First condition check of session to be less than 10 minutes 

        if (timestamps[i] - timestamps[start] < 600000) {
            let session = sessions[sessions.length - 1];
        
            //  calculate the duration of session by subtracting the consecutive timestamp with 
            // the start timestamp. 
            session.duration = timestamps[i] - timestamps[start];
            session.pages.push(url.get(timestamps[i]));
        } else {
            sessions.push({
                duration: 0,
                pages: [url.get(timestamps[i])],
                startTime: timestamps[i]
            })
            start = i;
        }
    }
    return sessions;
}