var app = angular.module('TBA', []);

app.controller('tbaCtrl',function($scope){
	var JSONFILE = 'tba.json';
	$scope.Math = window.Math;
	
	//Read in saved JSON data, or create the file if it doesn't exist
	var fso = new ActiveXObject("Scripting.FileSystemObject");
	var f = fso.OpenTextFile(JSONFILE, 1, true);
	var data = null;
	if(!f.AtEndOfStream){
		data = JSON.parse(f.ReadAll());
	}
	f.close();
	
	//Parse saved JSON data into objects
	$scope.employees = (data != null)?(data.hasOwnProperty('employees'))?data.employees:[]:[];
	$scope.taskGroups = (data != null)?(data.hasOwnProperty('mtp'))?data.mtp:[]:[];
	data = null;
	f = null;
	
	//Declare
	$scope.roles = [];
	$scope.selectedRole = {};
	$scope.loggedIn = false;
	
	//Obtains a list of employees then loops and calls sync on each employee individually
	$scope.syncEmployees = function(cb){
		//Check if logged in, if not, call login function with a call back to syncEmployees to start this function again
		if(!$scope.loggedIn){$scope.login(function(obj){if(obj.progress == 100){$scope.syncEmployees(cb);}});return null;}
		
		//Clear out old employee data
		$scope.employees = [];
		
		var axo = new XMLHttpRequest();
		
		//Requests 'Select Employee' page that contains a list of employees that are viewable by the user
		axo.onreadystatechange = function(){
			if(axo.readyState == 4){
				
				//Parse users employe ID and name
				if(axo.responseText.split("employeeId\" value=\"").length > 1){
					$scope.employees.push({
						//Parsing is page dependent, if the page changes this will not work
						id: axo.responseText.split("employeeId\" value=\"")[1].split("\">")[0], 
						name: axo.responseText.toString().match(/\n\s\n\s\n\s\w+,\s\w+\s\w\s\n/)[0].match(/\w+,\s\w+\s\w/)[0], 
						tasks: []
					});
				}
				
				//Loop through and parse each employee's ID and name
				var empsels = axo.responseText.split("empsel");
				for(var i=1;i<empsels.length;i++){
					$scope.employees.push({
						//Parsing is page dependent, if the page changes this will not work
						name: empsels[i].split("</td>")[1].split(">")[1].replace(/^\s*|\s*$|\n/g,""),
						id: empsels[i].split("</td>")[2].split(">")[1].replace(/^\s*|\s*$|\n/g,""),
						tasks: []
					});
				}
				
				//Loop through each employee and call sync, notify call back of progress/completion
				var count = 0;
				for(var i=0;i<$scope.employees.length;i++){
					$scope.syncEmployee($scope.employees[i].id,function(obj){
						if(obj.progress == 100){
							count++;
							if(count == $scope.employees.length){
								if(cb){cb({message: 'Complete', progress: 100});}
								$scope.status = {message: 'Complete', progress: 100};
								$scope.$apply();
							}else{
								if(cb){cb({message: 'Loading', progress: 100/$scope.employees.length*count});}
								$scope.status = {message: 'Loading', progress: 100/$scope.employees.length*count};
								$scope.$apply();
							}
						}
					});
				}
			}
		}
		axo.open("GET", "https://www.my.af.mil/IMDSTWeb/servlet/getItp?userAction=Select a Work Center", true);
		axo.send(null);
		if(cb){cb({message: 'Retrieving employee list', progress: 0});}
		$scope.status = {message: 'Retrieving employee list', progress: 0};
		$scope.$apply();
	};

	$scope.syncEmployee = function(id,cb){
		if(cb){cb({message:"Starting update",progress:0});}
		if(!$scope.loggedIn){$scope.login(function(obj){if(obj.progress == 100){$scope.syncEmployee(id,cb);}});return null;}
		var emp = null;
		for(var i=0;i<$scope.employees.length;i++){
			if($scope.employees[i].id == id){emp = i;}
		}
		if(emp == null){return null;}

		$scope.employees[emp].status = {message:"Starting update",progress:0};
		$scope.employees[emp].tasks = [];
		var _axo = new XMLHttpRequest();
		_axo.onreadystatechange = function()
		{
			if(_axo.readyState == 4)
			{
				$scope.employees[emp].status = {message:"Requesting ITL",progress:25};
				if(cb){cb({message:"Requesting ITL",progress: 25});}
				if(_axo.responseText.split("Pending Reports")[0].split("<td align=\"left\">"+id).length > 1)
				{
					_axo.onreadystatechange = function()
					{
						if(_axo.readyState == 4)
						{
							$scope.employees[emp].status = {message:"Processing ITL",progress:50};
							if(cb != null){cb({message:"Processing ITL",progress: 50});}
							$scope.employees[emp]['mtp'] = {};
							var datedif = 0;
							var lastDate = 0;
							$scope.employees[emp]['ITL'] = {};
							$scope.employees[emp]['ITL']['lastSeven'] = 0;
							$scope.employees[emp]['ITL']['lastThirty'] = 0;
							$scope.employees[emp]['ITL']['totalLoaded'] = 0;
							$scope.employees[emp]['ITL']['totalCompleted'] = 0;
							var pns = _axo.responseText.split("Product Type");
							for(var i=1;i<pns.length;i++){
								var tmp = pns[i].split("Employee Name")[0].split("style_17\">");
								var ttasks = [];
								var type = tmp[1].split("<")[0].match(/\(\w+\)/)[0].replace(/\(|\)/g,'');
								var number = tmp[2].split("<")[0];
								if(!$scope.employees[emp].tasks.hasOwnProperty(type)){$scope.employees[emp].tasks[type] = {};}
								if(!$scope.employees[emp].tasks[type].hasOwnProperty(number)){$scope.employees[emp].tasks[type][number] = {};}
								for(var a=4;a<tmp.length;a+=9){
									var cd = tmp[a+5].split("<")[0];
									var sd = tmp[a+4].split("<")[0];
									var comp = (cd == '-')?null:new Date(cd[0]+cd[1]+cd[2]+cd[3],parseInt(cd[4]+cd[5])-1,cd[6]+cd[7]);
									var start = (sd == '-')?null:new Date(sd[0]+sd[1]+sd[2]+sd[3],parseInt(sd[4]+sd[5])-1,sd[6]+sd[7]);
									var tra = (tmp[a+7].split("<")[0] == '-' || tmp[a+7].split("<")[0] == '&#xa0;')?null:tmp[a+7].split("<")[0];
									ttasks.push({
										id: tmp[a].split("<")[0],
										started: start,
										completed: comp,
										trained: tra
									});
								}
								for(a=0;a<ttasks.length-1;a++){
									var ta = ttasks[a].id.split(".");
									var tb = ttasks[a+1].id.split(".");
									if(ta.length < tb.length){
										ttasks.splice(a,1);
										a--;
									}else{
										$scope.employees[emp].tasks[type][number][ttasks[a].id] = ttasks[a];
										$scope.employees[emp]['ITL']['totalLoaded']++;
										delete $scope.employees[emp].tasks[type][number][ttasks[a].id].id;
										if(ttasks[a].completed != null){
											if(lastDate < ttasks[a].completed.getTime()){lastDate = ttasks[a].completed.getTime();}
											$scope.employees[emp]['ITL']['totalCompleted']++;
											datedif = ((new Date()).getTime() - ttasks[a].completed.getTime()) / 86400000;
											if(datedif <= 7){
												$scope.employees[emp]['ITL']['lastSeven']++;
											}
											if(datedif <= 30){
												$scope.employees[emp]['ITL']['lastThirty']++;
											}
										}
									}
								}
								for(gname in $scope.taskGroups){
									$scope.employees[emp].mtp[gname] = {completed: 0, loaded: 0, total: 0};
									for(type in $scope.taskGroups[gname]){
										for(number in $scope.taskGroups[gname][type]){
											for(id in $scope.taskGroups[gname][type][number]){
												$scope.employees[emp].mtp[gname].total++;
												if($scope.employees[emp].tasks.hasOwnProperty(type)){
													if($scope.employees[emp].tasks[type].hasOwnProperty(number)){
														if($scope.employees[emp].tasks[type][number].hasOwnProperty(id)){
															$scope.employees[emp].mtp[gname].loaded++;
															if($scope.employees[emp].tasks[type][number][id].trained != null){
																$scope.employees[emp].mtp[gname].completed++;
															}
														}
													}
												}
											}
										}
									}
								}
							}
							$scope.employees[emp]['ITL']['lastDate'] = new Date(lastDate);
							_axo.onreadystatechange = function()
							{
								if(_axo.readyState == 4)
								{
									if(_axo.responseText.split("<td align=\"left\">"+$scope.employees[emp].id).length > 1)
									{
										$scope.employees[emp].status = {message:"Removing ITL report",progress:75};
										if(cb != null){cb({message:"Removing ITL report", progress: 75});}
										_axo.open("GET","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/removeReport?reportId="+_axo.responseText.split("<td align=\"left\">"+$scope.employees[emp].id)[1].split("reportId=")[1].split("\">")[0]+"&cache="+Math.random(),true);
										_axo.send(null);
										$scope.$apply();
									}
									else
									{
										$scope.getAvailableTrainers($scope.employees[emp].id,cb);
									}
								}
							}
							_axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/viewReportQueue?cache="+Math.random(),true);
							_axo.send(null);
							$scope.$apply();
						}
					}
					_axo.open("GET","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/getReport?type=open&reportId="+_axo.responseText.split("<td align=\"left\">"+id)[1].split("reportId=")[1].split('&amp;')[0]+"&reportName=IMDST_ITL_ITP&format=HTML&cache="+Math.random(),true);
					_axo.send(null);
				}
				else
				{
					setTimeout(function(){ _axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/viewReportQueue?cache="+Math.random(),true); _axo.send(null);}, 1000);
				}
				$scope.$apply();
			}
		}
		var params = "reportTitle="+id+"&reportType=ITL&selectedOrgId=&selectedOrgLvl=&itpEmpId="+id+"&updateAfscSelect=false&updateUtcSelect=false&updateProductSelectRep=false&updateAfscFilter=false&updateSupervisorFilter=false&itlGroupBy=type&itlSortChoice=id&includeUnStarted=on&includeStarted=on&includeCompleted=on&includeCoreCert=on&includeCoreNonCert=on&includeActiveJE=on&includeNonCore=on&format=HTML";
		_axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/addReport",true);
		_axo.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		_axo.setRequestHeader("Content-length", params.length);
		_axo.setRequestHeader("Connection", "close");
		_axo.send(params);
	};

	$scope.addTrainer = function(empId,trainerIds,cb){
		if(!$scope.loggedIn){$scope.login(function(obj){if(obj.progress == 100){$scope.addTrainer(empId,trainerIds,cb);}});return null;}
		var axo = new XMLHttpRequest();
		var emp = null;
		for(var i=0;i<$scope.employees.length;i++){
			if($scope.employees[i].id == empId){emp = i;}
		}
		if(emp == null){return null;}

		if($scope.selectedRole.id == '29'){
			$scope.employees[emp].status = {message:"Adding trainer",progress:25};
			if(cb != null){cb({message:"Adding trainer",progress: 25});}
			axo.onreadystatechange = function(){
				if(axo.readyState == 4){
					$scope.employees[emp].status = {message:"Adding trainer",progress:50};
					if(cb != null){cb({message:"Adding trainer",progress: 50});}
					axo.onreadystatechange = function(){
						if(axo.readyState == 4){
							$scope.getAvailableTrainers(empId,cb);
						}
					}
					axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/addTrainerCertifier",true);
					axo.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
					var params = "addTr=true&addCert=false&";
					for(var i=0;i<trainerIds.length;i++){
						params += "trainerSel="+trainerIds[i].id+"&";
					}
					params += "trainer1=&emp1Type=01&trainer2=&emp2Type=01&trainer3=&emp3Type=01&trainer4=&emp4Type=01&userAction=Add";
					axo.send(params);
					$scope.$apply();
				}
			}
			axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/getItp")
			axo.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
			axo.send("TransactionName=SelectEmployee&BaseID=TestBase&empsel="+empId+"&userAction=Get+ITP");
			$scope.$apply();
		}
	}
	
	$scope.getAvailableTrainers = function(id,cb){
		if(!$scope.loggedIn){$scope.login(function(obj){if(obj.progress == 100){$scope.getAvailableTrainers(id,cb);}});return null;}
		var _axo = new XMLHttpRequest();
		var emp = null;
		for(var i=0;i<$scope.employees.length;i++){
			if($scope.employees[i].id == id){emp = i;}
		}
		if(emp == null){return null;}

		if($scope.selectedRole.id == '29'){
			$scope.employees[emp]['availableTrainers'] = [];
			$scope.employees[emp].status = {message:"Getting available trainers",progress:50};
			if(cb != null){cb({message:"Getting available trainers",progress: 50});}
			_axo.onreadystatechange = function(){
				if(_axo.readyState == 4){
					_axo.onreadystatechange = function(){
						if(_axo.readyState == 4){
							if(_axo.responseText.match("trainerSel") != null){
							var trainers = _axo.responseText.split("trainerSel")[1].split("</select>")[0].split(/\d+">(?=\d+)/);
								for(var i=1;i<trainers.length;i++){
									$scope.employees[emp]['availableTrainers'].push({id:trainers[i].split(" ")[0],name:trainers[i].split("<")[0].split(/\d+\s/)[1].split(",")[0]});
								}
							}
							$scope.employees[emp].status = {message:"Update complete",progress:100};
							$scope.save();
							$scope.$apply();
							if(cb != null){cb({message:"Update complete", progress: 100});}
						}
					}
					_axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/selectRemoveTrainerCertifier")
					_axo.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
					_axo.send("userAction=Add+Trainer");
					$scope.$apply();
				}
			}
			_axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/getItp")
			_axo.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
			_axo.send("TransactionName=SelectEmployee&BaseID=TestBase&empsel="+$scope.employees[emp].id+"&userAction=Get+ITP");
			$scope.$apply();
		}else{
			$scope.employees[emp].status = {message:"Update complete",progress:100};
			$scope.save();
			$scope.$apply();
			if(cb != null){cb({message:"Update complete", progress: 100});}
		}
	}
	
	$scope.syncMTP = function(cb){
		if(!$scope.loggedIn){$scope.login(function(obj){if(obj.progress == 100){$scope.syncMTP(cb);}});return null;}
		var _axo = new XMLHttpRequest();
		_axo.onreadystatechange = function()
		{
			if(_axo.readyState == 4)
			{
				_axo.onreadystatechange = function()
				{
					if(_axo.readyState == 4)
					{
						$scope.taskGroups = {};
						var gps = _axo.responseText.split("productName=");
						gps.shift();
						var started = gps.length;
						for(var i=0;i<gps.length;i++)
						{
							var name = unescape(gps[i].split("\">")[0].replace(/\+/g, " "));
							if(!$scope.taskGroups.hasOwnProperty(name)){$scope.taskGroups[name] = {};}
							$scope.syncGroup(name,function(obj){
								if(obj.progress == 100){
									started--;
									if(started == 0){
										if(cb){cb({message:"Loading Task Groups", progress:100});}
										$scope.status = {message:"Loading Task Groups", progress:100};
										$scope.save();
										$scope.$apply();
										$scope.syncEmployees(cb);
									}else{
										if(cb){cb({message:"Loading Task Groups", progress:100/gps.length*(gps.length-started)});}
										$scope.status = {message:"Loading Task Groups", progress:100/gps.length*(gps.length-started)};
										$scope.$apply();
									}
								}
							});
						}
					}
				}
				var params = "userAction=Search&start=&productName=&selectedWorkcenter=37060&tasksDisplayType=byGroups&resultsPerPage=500&cache="+Math.random();
				_axo.open("POST","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/mtpQuery?cache="+Math.random());
				_axo.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				_axo.setRequestHeader("Content-length", params.length);
				_axo.setRequestHeader("Connection", "keep-alive");
				_axo.send(params);
				$scope.status = {message:"Retrieving task group names", progress:25};
				$scope.$apply();
			}
		}
		_axo.open("GET","https://www.my.af.mil/IMDSTWeb/servlet/mtpQuery?userAction=open&cache="+Math.random());
		_axo.send(null);
		$scope.status = {message:"Starting MTP synchronization", progress:0};
		$scope.$apply();
	};

	$scope.syncGroup = function(name,cb){
		var axo = new XMLHttpRequest();
		axo.onreadystatechange = function(){
			if(axo.readyState == 4){
				var tmp = axo.responseText.split("tasknormal");
				if(tmp.length < 2){alert(name+"\n"+tmp)};
				for(var i=1;i<tmp.length;i++){
					var type = tmp[i].match(/\s\n\s\w+&nbsp;/)[0].match(/\w+(?=&)/)[0];
					var number = tmp[i].split(/\s\n\s&nbsp;/)[0].split(/\s\n\s/)[2];
					var id = tmp[i].split(/\s\n\s/)[4];
					var de = tmp[i].split(/<\/strong>\s\n\s/)[1].split(/\s\n/)[0];
					var co = tmp[i].split("Indicator")[1].split("</")[1].split(">")[1].replace(/&nbsp;|\n+|\s+/g,'');
					var mi = tmp[i].split("Coverage")[1].split("</")[1].split(">")[1].replace(/&nbsp;|\n+|\s+/g,'');
					if(!$scope.taskGroups.hasOwnProperty(name)){$scope.taskGroups[name] = {};}
					if(!$scope.taskGroups[name].hasOwnProperty(type)){$scope.taskGroups[name][type] = {};}
					if(!$scope.taskGroups[name][type].hasOwnProperty(number)){$scope.taskGroups[name][type][number] = {};}
					if(!$scope.taskGroups[name][type][number].hasOwnProperty(id)){$scope.taskGroups[name][type][number][id] = {};}
					$scope.taskGroups[name][type][number][id] = {Description:de,Core:co,MinCoverage:mi};
				}
				if(cb){cb({message:"Complete", progress:100});}
			}
		}
		axo.open("GET","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/mtpQuery?userAction=showNextProduct&productName="+escape(name.replace(/\s/g,"+"))+"&cache="+Math.random());
		axo.send(null);
		if(cb){cb({message:"Loading", progress:50})};
	}
	
	$scope.login = function(cb){
		$scope.status = {message:"Logging in",progress:0};
		if(cb){cb({message:"Logging in",progress:0});}
		var iframe = document.createElement("iframe");
		var div = document.createElement("div");
		var loggedIn = function(){ 
			$scope.status = {message:"Logging in",progress:25};
			if(cb){cb({message:"Logging in",progress:25});}
			document.body.removeChild(div);
			div.innerHTML = "";
			div = null;
			var axo = new XMLHttpRequest();
			axo.onreadystatechange = function(){
				if(axo.readyState == 4){
					$scope.status = {message:"Getting roles",progress:50};
					if(cb){cb({message:"Getting roles",progress:50});}
					axo.onreadystatechange = function(){
						if(axo.readyState == 4){
							var roles = axo.responseText.split("selectedRole")[1].split("</select>")[0].split("value=\"");
							for(var i=0;i<roles.length;i++){
								if(roles[i].split("\"")[0] != '03'){
									$scope.roles.push({id:roles[i].split("\"")[0],name:roles[i].split("<")[0].split(">")[1]});
								}
							}
							$scope.roles.sort(function(a,b){return b.id-a.id;});
							$scope.selectedRole = {id:"00",name:"No roles found"};
							if($scope.roles.length > 0){$scope.selectedRole = $scope.roles[0]};
							$scope.status = {message:"Selecting highest role ("+$scope.selectedRole.id+")",progress:75};
							if(cb){cb({message:"Selecting highest role ("+$scope.selectedRole.id+")",progress:75});}
							axo.onreadystatechange = function(){
								if(axo.readyState == 4){
									$scope.loggedIn = true;
									$scope.status = {message:"Logged in",progress:100};
									if(cb){cb({message:"Logged in", progress: 100});}
									$scope.$apply();
								}
							}
							axo.open("POST", "https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/roleSelection", true);
							var params = "userAction=Switch Role&selectedRole="+$scope.selectedRole.id;
							axo.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
							axo.setRequestHeader("Content-length", params.length);
							axo.setRequestHeader("Connection", "close");
							axo.send(params);
							$scope.$apply();
						}
					}
					axo.open("GET","https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/roleSelection?userAction=open", true);
					axo.send(null);
					$scope.$apply();
				}
			}
			axo.open("GET", "https://www.my.af.mil/EAI_JUNCTION/eai/auth?refURL=https://www.my.af.mil/faf/FAF/fafHome.jsp", true);
			axo.send(null);
			$scope.$apply();
		}
		iframe.id = "TBAIframeLogin";
		iframe.src = "https://www.my.af.mil/EAI_JUNCTION/eai/auth?refURL=https://www.my.af.mil/imdsltpa-tba/IMDSTWeb/servlet/roleSelection?userAction=open";
		iframe.onload = loggedIn;
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.style.align = "center";
		div.style.width = "100%";
		div.style.height = "100%";
		div.style.position = "absolute";
		div.style.top = 0;
		div.style.left = 0;
		div.style.visibility = "hidden";
		div.appendChild(iframe);
		document.body.appendChild(div);
		$scope.$apply();
	}
	
	$scope.save = function(){
		var val = [];
		for(var i=0;i<$scope.employees.length;i++){
			val.push($scope.employees[i].show);
			$scope.employees[i].show = false;
		}

		var f = fso.OpenTextFile(JSONFILE, 2, true);
		f.Write(JSON.stringify({employees: $scope.employees, mtp: $scope.taskGroups}));
		f.close();
		f = null;
		
		for(var i=0;i<$scope.employees.length;i++){
			$scope.employees[i].show = val.shift();
		}
	};
});
