const got = require('got')
const dotenv = require('dotenv')
const moment = require('moment')
const dedupe = require('dedupe')
const { response } = require('express')

dotenv.config()
var url = process.env.url
var post_url = process.env.post_url

got.get(url).then((response)=>{

    // Variables Declared
    var country_availablity = {}
    var payload = {}
    var event_payload = {}
    var invitation = {
        countries: []
    }

    var raw_data = JSON.parse(response.body)
    var partners = raw_data.partners

    partners.forEach((partner)=>{
        const availableDates = partner.availableDates
        const country = partner.country
        const email = partner.email
        let newAvailableDates

        if(!country_availablity[country]){
            country_availablity[country] = {}
            payload[country] = []
            event_payload[country] = []
        }

       newAvailableDates = availableDates.filter((currentDate, key, arr)=>{
           return moment(currentDate).diff(arr[key - 1], 'days') === 1 || moment(currentDate).diff(arr[key + 1], 'days') === -1
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

    //  restructure payload for sorting

    for(let country in country_availablity){
        if(country_availablity.hasOwnProperty(country)){
            for(let date in country_availablity[country]){
                payload[country].push({
                    date:date,
                    attendees: country_availablity[country][date].attendees
                })
            }
        }
    }
    // sort dates

    for(let country in payload){
        if(payload.hasOwnProperty(country)){
            payload[country].sort((current, next)=>{
                if(moment(current.date).isBefore(moment(next.date))){
                    return -1
                } else {
                    return 1
                }
            })
        }
    }
    //  Combined two Events
    for(let country in payload){
        if(payload.hasOwnProperty(country)){
            for(let i = 0; i < payload[country].length; i++){
                if( i !== 0){
                    event_payload[country].push({
                        dates: [
                            payload[country][i - 1].date,
                            payload[country][i].date
                        ],
                        attendeeCount: dedupe(keepOnlyDuplicatesAttendees(payload[country][i - 1].attendees.concat(payload[country][i].attendees))).length,
                        attendees:dedupe(keepOnlyDuplicatesAttendees(payload[country][i - 1].attendees.concat(payload[country][i].attendees)))

                    })
                }
            }
        }
    }
    // console.log(event_payload["France"])
    //  sort on counts
    for( let country in event_payload){
        if(event_payload.hasOwnProperty(country)){
            event_payload[country].sort((current, next)=>{
                if(current.attendeeCount > next.attendeeCount){
                    return -1
                } else if(current.attendeeCount < next.attendeeCount) {
                    return 1;
                } else {
                    if (moment(current.dates[0]).isBefore(moment(next.dates[0]))) {
                        return -1;
                     } else {
                        return 1;
                     }
                }
            })
        }
    }
    // map to required Invitation
    for( let country in event_payload){
        if(event_payload.hasOwnProperty(country)){
            invitation['countries'].push({
                attendeeCount: event_payload[country][0].attendeeCount,
                attendees: event_payload[country][0].attendees,
                name: country,
                startDate: event_payload[country][0].dates[0] ? event_payload[country][0].dates[0] : null
            })
        }
    }
    
    // POST API
    got.post(post_url, {
        body: JSON.stringify(invitation),
        headers: {
            'Content-type': 'application/json'
        }
    }).then((response) => {
        console.log(response.body);
    }).catch((error) => {
        console.error(error);
    });;
}).catch((error) => {
    console.error(error);
});

function keepOnlyDuplicatesAttendees(array) {
    let result = [];
    for(let i = 0; i < array.length; i++) {
        let temp = array.slice();
        temp.splice(i, 1)
        if(temp.indexOf(array[i]) > -1) {
            result.push(array[i]);
        }
    }
    return result;
}