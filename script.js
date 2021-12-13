const got = require('got')
const dotenv = require('dotenv')
const axios = require('axios')

dotenv.config()
var url = process.env.url
var post_url = process.env.post_url

const map = new Map();
let sessionsByUser = {}

// GET API for fetching events
axios.get(url).then((response)=>{
    var data = response.data
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
    
    // POST API
    console.log(sessionsByUser)
    axios.post("https://candidate.hubteam.com/candidateTest/v3/problem/result?userKey=08c477ddccfeb6646a6b3011163a",
    sessionsByUser).then((response) => {
        console.log(response.body);
    }).catch((error) => {
        console.error(error);
    });

})
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
        
            //  calculate the duration of session 
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