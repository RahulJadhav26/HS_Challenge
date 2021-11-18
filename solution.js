
const axios = require('axios')
const dotenv =require('dotenv')
const moment = require('moment')
const dedupe = require('dedupe')

dotenv.config()
var url = process.env.url
var post_url = process.env.post_url
axios.get(url).then((response) =>{
    const raw_data = response.data
    const partners =  raw_data.partners

    // Variables Declaration
    var country_availablity = {}
    var payload = {}
    var event_payload = {}
    var Invitations = {
        countries: []
    }
    let newAvailableDates

    partners.forEach((partner)=>{
        const availableDates = partner.availableDates
        const country = partner.country
        const email = partner.email

        if(!country_availablity[country]){
            country_availablity[country] = {}
            payload[country] = []
            event_payload[country] = []
        } 
        //  Find all consecutive available days 
        newAvailableDates = availableDates.filter((currentDate, key, arr)=>{
            return moment(currentDate).diff(moment(arr[key + 1]), 'days') === -1 || moment(currentDate).diff(moment(arr[key - 1]), 'days') === 1 
        })
        
        newAvailableDates.forEach((date) =>{
            if(country_availablity[country][date]){
                country_availablity[country][date].attendees.push(email)
            }else{
                country_availablity[country][date]= {
                    attendees: [email]
                }
            }
        })
    }) 
   
    // Desired Payload 
    for(var country in country_availablity){
        if(country_availablity.hasOwnProperty(country)){
            for(var date in country_availablity[country]){
                payload[country].push({
                    date:date,
                    attendees: country_availablity[country][date].attendees
                })
            }
        }
    }
     // 
     for (let country in payload) {
        if (payload.hasOwnProperty(country)) {
            payload[country].sort((obj,next_obj ) => {
                if (moment(obj.date).isBefore(moment(next_obj.date))) {
                    return -1;
                } else {
                    return 1;
                }
            });
        }
    }



    // two consecutive dates  event_payload created
    for(var country in payload){
        if(payload.hasOwnProperty(country)){
            for(let i = 0; i < payload[country].length; i++){              
               if(i !== 0){
                // var test = dedupe(keepDuplicates(payload[country][i - 1].attendees.concat(payload[country][i].attendees))).length
                // console.log(test)
                var attendees = new Set(payload[country][i - 1].attendees.concat(payload[country][i].attendees))
                   event_payload[country].push({
                       dates: [
                           payload[country][i - 1].date,
                           payload[country][i - 1].date
                       ],
                       attendeeCount: dedupe(keepDuplicates(payload[country][i - 1].attendees.concat(payload[country][i].attendees))).length,
                       attendees: dedupe(keepDuplicates(payload[country][i - 1].attendees.concat(payload[country][i].attendees)))
                   })
               }
            }
        }
    }
    // Finding most number of guests available on which Date by sorting 

    for (var country in event_payload){
        if(event_payload.hasOwnProperty(country)){
            event_payload[country].sort((obj,next_obj)=>{
                if(obj.attendeeCount > next_obj.attendeeCount){
                    return -1
                } else if(obj.attendeeCount < next_obj.attendeeCount) {
                    return 1
                } else {
                    if(moment(obj.dates[0]).isBefore(moment(next_obj.dates[0]))) {
                        return -1;
                     } else {
                        return 1;
                     }
                }
            })
        }
    }
    
    // Create Post Invitations

    for( var country in event_payload){
        if(event_payload.hasOwnProperty(country)){
                Invitations['countries'].push({
                    attendeeCount: event_payload[country][0].attendeeCount,
                    attendees: event_payload[country][0].attendees,
                    name: country,
                    startDate: event_payload[country][0].dates[0] ? event_payload[country][0].dates[0] : null 
                })
        }
    }

console.log(Invitations)
//  Let's POST the Invitation

axios.post(post_url, {
        data: JSON.stringify(Invitations),
        headers: {
            'Content-type': 'application/json'
        }
    }).then((res)=>{
        console.log(res.response.data)
    }).catch((err)=>{
        console.log(err.response.data)
    })

}).catch((error)=>{
    console.log(error)
})

function keepDuplicates(array) {
    let result = [];

    for(let i = 0; i < array.length; i++) {
        let temp = array.slice();
        temp.splice(i, 1);
        if(temp.indexOf(array[i]) > -1) {
            result.push(array[i]);
        }
    }
    return result;
}
