/*
Copyright 2017 Vladislav Grigoriev

Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action && request.action == "show_page") {
		chrome.pageAction.show(sender.tab.id);
  	}

  	if (request.action && request.action == "hide_page") { 
  		chrome.pageAction.hide(sender.tab.id);
  	}
});

chrome.pageAction.onClicked.addListener(function(tab) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  		chrome.tabs.sendMessage(tabs[0].id, {query: "events"}, processResponse);
	});
})

var LINE_ENDING = '\r\n';
var DATE_FORMAT = 'YYYYMMDDTHHmmss'

var BEGIN = 'BEGIN:'
var END = 'END:'

var VCALENDAR = 'VCALENDAR'

var VERSION = 'VERSION:'
var PRODID = 'PRODID:'
var CALNAME = 'X-WR-CALNAME:'

var VEVENT = 'VEVENT'

var DTSTART = 'DTSTART:'
var DTEND = 'DTEND:'
var RRULE = 'RRULE:'
var UID = 'UID:'
var DTSTAMP = 'DTSTAMP:'
var SUMMARY = 'SUMMARY:'

function processResponse(response) {
	if (parseInt(response.potok) < 153) {
		alert('Экспорт расписания возможен только с 2013 года')
		return
	}

    moment.locale('ru')

	var year = yearFromPotok(parseInt(response.potok))
	var firstSemptember = moment({year : year, month: 8, day: 1});

	if (firstSemptember.weekday() == 6) {
		var firstWeek = firstSemptember.add(1, 'days') 
	}
	else {
		var firstWeek = firstSemptember
	}

	if (response.semestr == 1) {
		var lastWeek = moment({year: year, month: 11, day: 31}) // В первом семестре занятия идут до 31 декабря
	}
	else {
		firstWeek.add(23, 'weeks')
		firstWeek.weekday(0)

		var lastWeek = firstWeek.clone() // Во втором семестре занятия идут 16 недель
		lastWeek.add(16, 'weeks')
		lastWeek.weekday(6)
		lastWeek.hour(23)
		lastWeek.minute(59)
	}

	var name = 'Расписание - ' + response.substance + '(' + yearFromPotok(parseInt(response.potok)) + ' год, '  + response.semestr + ' семестр)'

	var iCal = BEGIN + VCALENDAR + LINE_ENDING
	iCal = iCal + VERSION + '2.0' + LINE_ENDING
	iCal =  iCal + PRODID + '-//Grigoriev Vladislav//TTI SFU Timetable Export' + LINE_ENDING
	iCal = iCal + CALNAME + name + LINE_ENDING

	response.events.forEach(function(event) {
		iCal = iCal + createICalEvent(event, firstWeek, lastWeek)
	})

	iCal = iCal + END + VCALENDAR + LINE_ENDING

	var encodedUri = encodeURI("data:text/ics;charset=utf-8," + iCal)
	var filename = name + '.ics'
	chrome.downloads.download({url: encodedUri,
							   filename: filename});
}

function createICalEvent(event, firstWeek, lastWeek) {
	var vEvent = BEGIN + VEVENT + LINE_ENDING

	var startTime = moment(event.timeInterval.start, "HH:mm")
	var endTime = moment(event.timeInterval.end, "HH:mm")

	if (event.weekday) {
		var firstDate = firstWeek.clone()
		firstDate.isoWeekday(event.weekday)

		if (firstWeek.weekday() > firstDate.weekday()) {
			firstDate.add(1, 'weeks')
		}

		var weeksPattern = /(\([0-9]{1,2}-[0-9]{1,2}\))/g
		var weeksMathes = event.text.match(weeksPattern)

		if (weeksMathes) {
			var lastDate = firstWeek.clone()

			var weeksInterval = {
								 start: parseInt(weeksMathes[0].substring(1, weeksMathes[0].length - 1).split('-')[0]),
								 end: parseInt(weeksMathes[0].substring(1, weeksMathes[0].length - 1).split('-')[1])
								}

			switch(event.week) {
				case 1:
					if (weeksInterval.start % 2 != 0) {
						weeksInterval.start++
					}
					if (weeksInterval.end % 2 != 0) {
						weeksInterval.end--
					}
					break

				case 2:
					if (weeksInterval.start % 2 == 0) {
						weeksInterval.start++
					}
					if (weeksInterval.end % 2 == 0) {
						weeksInterval.end--
					}
					break
			}

			firstDate.add(weeksInterval.start - 1, 'weeks')
			lastDate.add(weeksInterval.end - 1, 'weeks')
		}
		else {
			var lastDate = lastWeek.clone()

			switch(event.week) {
				case 1:
					if (firstDate.week() - firstWeek.week() == 1) {
						irstDate.add(1, 'weeks')
					}
					break

				case 2:
					if (firstDate.week() - firstWeek.week() == 0) {
						irstDate.add(1, 'weeks')
					}
					break
			}
		}

		firstDate.hour(startTime.hour())
		firstDate.minute(startTime.minute())
		vEvent = vEvent + DTSTART + firstDate.format(DATE_FORMAT) + LINE_ENDING

		firstDate.hour(endTime.hour())
		firstDate.minute(endTime.minute())
		vEvent = vEvent + DTEND + firstDate.format(DATE_FORMAT) + LINE_ENDING

		lastDate.hour(endTime.hour())
		lastDate.minute(endTime.minute())
		vEvent = vEvent + RRULE + 'FREQ=WEEKLY' + (event.week != 0 ? ';INTERVAL=2' : '') + ';UNTIL=' + lastDate.format(DATE_FORMAT) + LINE_ENDING
	}
	
	if (event.date) {
		var eventDate = moment(event.date, "DD.MM.YYYY")

		eventDate.hour(startTime.hour())
		eventDate.minute(startTime.minute())
		vEvent = vEvent + DTSTART + eventDate.format(DATE_FORMAT) + LINE_ENDING

		eventDate.hour(endTime.hour())
		eventDate.minute(endTime.minute())
		vEvent = vEvent + DTEND + eventDate.format(DATE_FORMAT) + LINE_ENDING
	}

	var uid = (event.text + ' ' + event.timeInterval.start + ' ' + event.timeInterval.end + ' ' + (event.weekday ? event.weekday : event.date)).split(' ').join('_')
	vEvent = vEvent + UID + uid + LINE_ENDING
	vEvent = vEvent + DTSTAMP + moment().utc().format(DATE_FORMAT) + 'Z' + LINE_ENDING
	vEvent = vEvent + SUMMARY + event.text + LINE_ENDING
	vEvent = vEvent + END + VEVENT + LINE_ENDING
	return vEvent
}

function yearFromPotok(potok) {
	return 2013 - 153 + potok
}

function log(any) {
	chrome.extension.getBackgroundPage().console.log(any)
}