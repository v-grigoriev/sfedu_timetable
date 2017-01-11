/*
Copyright 2016 Vladislav Grigoriev

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

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

class SelectionManager {
	constructor(table) {
		this.table = table

		this.cells = table.querySelectorAll(".selectable")
		this.selectedCells = table.querySelectorAll(".selected")

		this.selectAllText = document.createTextNode("[Выбрать все]")
		this.clearSelectionText = document.createTextNode("[Снять выделение]")

		this.selectAllButton = document.createElement("SPAN")
		this.selectAllButton.classList.add("select_all")
		this.selectAllButton.appendChild(this.selectAllText)

		var self = this
		this.selectAllButton.onclick = function() {
			self.onSelectAllClick(this)
		}
	}

	onCellClick(cell) {
		this.setCellSelected(cell, !cell.classList.contains("selected"))
	}

	setCellSelected(cell, selected) {
		if (selected) {
			cell.classList.add("selected")
		}
		else {
			cell.classList.remove("selected")
		}
		
		var selectedCells = this.table.querySelectorAll(".selected")

		if (this.callback && typeof this.callback == "function") {
			if ((this.selectedCells.length == 0 && selectedCells.length > 0) || (this.selectedCells.length > 0 && selectedCells.length == 0)) {
				this.callback(selectedCells.length > 0)
			}
		}

		this.selectedCells = this.table.querySelectorAll(".selected")
		this.updateSelectAllTitle()
	}

	onSelectAllClick(selectAllButton) {
		var selected = this.cells.length !== this.selectedCells.length

		var self = this
		this.cells.forEach(function(cell) {
			self.setCellSelected(cell, selected)
		})
	}

	updateSelectAllTitle() {
		if (this.cells.length === this.selectedCells.length) {
			this.selectAllButton.replaceChild(this.clearSelectionText, this.selectAllButton.childNodes[0])
		}
		else {
			this.selectAllButton.replaceChild(this.selectAllText, this.selectAllButton.childNodes[0])
		}
	}
}

if (parseInt(getParameterByName("isPotok")) >= 153)  {
	var eventRegex = /(([А-Яа-я]+\s+[А-Яа-я]+\.([А-Яа-я]+\.)?\s+)?(.+?)\s+(\((лек|прак|лаб|экз|конс)\.\))\s+((([А-Яа-я]{4}[0-9]{1,2})\s*?-\s*?[0-9]+)(\s+(1|2)пг\.)?\s*)*([А-Яа-я0-9]+\s*-\s*[А-Яа-я0-9]+)(\s+\([0-9]+-[0-9]+\))?(\s+(1|2)пг\.)?)/g;
	var weekdayRegex = /(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье)/g;
	var dateRegex = /([0-9]+\.[0-9]+\.[0-9]+)/g;
	
	var tables = document.querySelectorAll("table")
	
	tables.forEach(function(table) {
		var timeIntervals = {}
		var weekdays = {}
		var dates = {}
	
		var firstCell = table.querySelectorAll("td.th_row_day")[0]
		var timesRow = firstCell.parentNode
	
		for (var i = firstCell.cellIndex + 1; i < timesRow.cells.length; i++) {
			timeIntervals[i] = timesRow.cells[i].textContent
		}
	
		for (var i = timesRow.rowIndex + 1; i < table.rows.length; i+=2) {
			var text = table.rows[i].cells[0].textContent
			var matches = text.match(weekdayRegex)
			
			if (matches && matches.length == 1) {
				weekdays[i] = text
				weekdays[i+1] = text
			}
			else {
				var matches = text.match(dateRegex)
				if (matches && matches.length == 1) {
					dates[i] = text
					dates[i+1] = text
				}
			}
		}
	
		[].slice.call(table.querySelectorAll("td.row, td.row_rowspan")).filter(function(cell) { return cell.textContent !== "" }).forEach(function(cell) {
			var rowIndex = cell.parentNode.rowIndex
			
			if (weekdays[rowIndex] || dates[rowIndex]) {
				if (rowIndex % 2 == 0) {
					var cellIndex = cell.cellIndex
				}
				else {
					var cellIndex = table.rows[rowIndex - 1].querySelectorAll("td.row")[cell.cellIndex].cellIndex
				}
		
				if (cell.classList.contains("row_rowspan")) {
					var week = 0
				}
				else {
					var week = rowIndex % 2 == 0 ? 1 : 2
				}
		
				var text = cell.textContent
				text.trim()
		
				var untrimmedMatches = text.match(eventRegex)
				if (untrimmedMatches && untrimmedMatches.length > 1) {
					cell.removeChild(cell.childNodes[0])
		
					var container = document.createElement('DIV')
					container.classList.add('table_timetable')
		
					var matches = []
		
					untrimmedMatches.forEach(function(match) {
						matches.push(match.trim())
					})
		
					matches.sort(function(a,b) {
						return a.localeCompare(b)
					})
		
					matches.forEach(function(match) {
						var row = document.createElement('DIV')
						row.classList.add('row_timetable')
		
						var div = document.createElement('DIV')
						div.classList.add('selectable')
						div.classList.add('cell_timetable')
						div.appendChild(document.createTextNode(match))
		
						div.setAttribute("data-time-interval", timeIntervals[cellIndex])
						div.setAttribute("data-week", week)
		
						if (weekdays[rowIndex]) {
							div.setAttribute("data-weekday", weekdays[rowIndex])
						}
						if (dates[rowIndex]) {
							div.setAttribute("data-date", dates[rowIndex])
						}
	
						row.appendChild(div)
						container.appendChild(row)
					})
					cell.appendChild(container)
				}
				else {
					cell.classList.add('selectable')
		
					cell.setAttribute("data-time-interval", timeIntervals[cellIndex])
					cell.setAttribute("data-week", week)
		
					if (weekdays[rowIndex]) {
						cell.setAttribute("data-weekday", weekdays[rowIndex])
					}
					if (dates[rowIndex]) {
						cell.setAttribute("data-date", dates[rowIndex])
					}
				}
			}
		})
	})
	
	var hasSelectedCellsPerTable = 0
	
	tables.forEach(function(table) {
		var manager = new SelectionManager(table)
		manager.cells.forEach(function (cell) {
			cell.onclick = function() {
				manager.onCellClick(this)
			}
		})
	
		var firstCell = table.querySelectorAll("td.th_row_day")[0]
		firstCell.appendChild(manager.selectAllButton)
	
		manager.callback = function(hasSelected) {
			hasSelectedCellsPerTable = hasSelectedCellsPerTable + (hasSelected ? 1 : -1)
	
			if (hasSelectedCellsPerTable > 0) {
				chrome.runtime.sendMessage({action: "show_page"});
			}
			else {
				chrome.runtime.sendMessage({action: "hide_page"});
			}
		}
	})
	
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	    if (request.query && request.query == "events") {
	  	  	var selectedElements = document.querySelectorAll(".selected")
	  	  	var events = []
	  	  	selectedElements.forEach(function(element) {
	  	  		var event = {text: element.textContent}
	  	  		event.text.trim()
	
	  	  		if (element.hasAttribute("data-time-interval")) {
	  	  			var timeIntervalString = element.getAttribute("data-time-interval")
	  	  			event.timeInterval = {start: timeIntervalString.split('-')[0], end: timeIntervalString.split('-')[1]}
	  	  		}
	  	  		if (element.hasAttribute("data-week")) {
	  	  			event.week = element.getAttribute("data-week")
	  	  		}
	  	  		if (element.hasAttribute("data-weekday")) {
	  	  			event.weekday = element.getAttribute("data-weekday")
	  	  		}
	   	  		if (element.hasAttribute("data-date")) {
	  	  			event.date = element.getAttribute("data-date")
	  	  		}
	  	      	events.push(event)
	  	  	})
	
	  	  	for (var i = events.length - 2; i >= 0; i--) {
	  	  		if(events[i].text === events[i+1].text) {
	  	  			events[i].timeInterval.end = events[i+1].timeInterval.end
	  	  			events.splice(i+1, 1)
	  	  		}
	  	  	}

	  	  	sendResponse({
	  	  					substance: getParameterByName("Substance"), 
	  	  			 		potok: getParameterByName("isPotok"), 
	  	  					semestr: getParameterByName("Semestr"), 
	  	  					events: events
	  	  				})
	  	}
	});
}








