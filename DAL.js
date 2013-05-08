var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());
var async = require('async');
var fs = require('fs-extra');

var datapath = '';

var DBTablePath = '\\users.db';

var DB = '';


//generate a random id.
function GUID()
    {
        var S4 = function ()
        {
            return Math.floor(
                    Math.random() * 0x10000 /* 65536 */
                ).toString(16);
        };

        return (
                S4() + S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + "-" +
                S4() + S4() + S4()
            );
    }
	
function getUser (id,cb)
{
	getUsers(function(UserIndex){
	
		if(UserIndex.indexOf(id) != -1)
		{
			DB.get(id,function(err,doc,key){
			
				cb(doc);
			});
		}
		else
		{
			cb(null);
		}
	
	});
	
}
function updateUser (id,data,cb)
{
	async.waterfall([
		function(cb2)
		{
			//first, get the existing record
			getUser(id,function(user)
			{
				cb2(null,user);
			});
		},
		function(user,cb2)
		{
			//if the record does not exist, callback false
			if(user == null)
			{
				cb2('user does not exist');
			}else
			{
				cb2(null,user);
			}
		},
		function(user,cb2)
		{
			if(data.username)
			{
				
				cb2('cant change username');
				return;
			}
			for(var key in data)
			{
				user[key] = data[key];
			}
			
			DB.save(id,user,function(err,doc,key)
			{
				cb2(null,doc);
			});
		}],
		function(err, results)
		{
			if(err)
			{
				global.log(err,0);
				cb(false);
			}
				
			cb(true);	
		}
	);	
};
function deleteInventoryItem(userID,inventoryID,cb)
{
	getInventoryForUser(userID,function(inventory,Ikey)
	{	
		if(!inventory)
		{
			global.log('inventory not found');
			cb();
			return;
		}
		//item must be in list of user
		if(inventory.indexOf(inventoryID) != -1)
		{
			//remove from user inventory list
			while(inventory.indexOf(inventoryID) != -1)
				inventory.splice(inventory.indexOf(inventoryID),1);
			//save user inventory list	
			DB.save(Ikey,inventory,function()
			{
				//remove database entry
				DB.remove(inventoryID,function(){
				
					//delete file
					fs.unlink(datapath+'\\Profiles\\'+userID+'_Data\\' + inventoryID,function()
					{
						cb();
					});
				});
			});
		}
		else
		{
			cb();
		}	
	});

}
function getInventoryItemAssetData(userID,inventoryID,cb)
{
	getInventoryForUser(userID,function(inventory,Ikey)
	{
	
		if(!inventory)
		{	
			global.log('inventory not found',0);
			cb(null);
			return;
		}
		if(inventory.indexOf(inventoryID) != -1)
		{
			fs.readFile(datapath + '\\Profiles\\' + userID + '_Data' + '\\' + inventoryID,"utf8",function(err,data)
			{
				cb(data);
			});			
		}
		else
		{
			global.log('User does not contain inventory item');
			cb(null);
		}
	});
}
function getInventoryItemMetadata(userID,inventoryID, cb)
{
	getInventoryForUser(userID,function(inventory,Ikey)
	{
		if(!inventory)
		{
			cb(null);
			return;
		}
		if(inventory.indexOf(inventoryID) != -1)
		{
			DB.get(inventoryID,function(err,doc,key)
			{
				cb(doc,key);
			});
		}
		else
		{
			global.log('User does not contain inventory item');
			cb(null);
		}
	});
}

function updateInventoryItemMetadata(userID,inventoryID,data, cb)
{
	getInventoryForUser(userID,function(inventory,Ikey)
	{
		if(!inventory)
		{	
			global.log('inventory not found',0);
			cb(null);
			return;
		}
		if(inventory.indexOf(inventoryID) != -1)
		{
			DB.get(inventoryID,function(err,item)
			{
				if(!item)
				{	
					global.log('item not found',0);
					cb(null);
					return;
				}
				for(var key in data)
				{
					item[key] = data[key];
				}
				DB.save(inventoryID,item,function()
				{
				    global.log('saved' + item,0);
					cb();
				});
			});
		}
		else
		{
			global.log('User does not contain inventory item');
			cb(null);
		}
	});
}

function addToInventory(userID,data,assetdata,cb)
{
	//get the inventor list for the user
	getInventoryForUser(userID,function(inventory,Ikey)
	{
		//save the data
		DB.save(null,data,function(err,key)
		{	
			//put the key for the data in the inventory
			inventory.push(key);
			
			//save the inventory
			DB.save(Ikey,inventory,function(err)
			{
				fs.writeFile(datapath+'\\Profiles\\' + userID + '_Data\\' + key,JSON.stringify(assetdata),function(err)
				{
					cb();
				});	
			});
			
		});
	});
}
function getInventoryForUser(userID,cb)
{
	getUser(userID,function(user)
	{
		var ik = user && user.inventoryKey;
		DB.get(ik,function(err,doc,key)
		{
			cb(doc,ik);
		});
		
	});
}
function getInventoryDisplayData(userID,cb)
{
	getInventoryForUser(userID,function(inventory)
	{
		var list = [];
		async.each(inventory,
		function(item,cb2){
		
			getInventoryItemMetadata(userID, item,function(data)
			{
				list.push({title:data.title,description:data.description,type:data.type,key:item});
				cb2();
			});
		
		},
		function(){
			cb(list);
		});
	
	
	})
}
function createUser (id,data,cb)
{
	getUser(id,function(user){
	
		if(user)
		{
			global.log('user '+ id + ' already exists');
			cb(false);
		}
		else
		{
			console.log('got here');
			async.waterfall([
			function(cb2){
				
				var inventory = [];
				DB.save(null,inventory,function(err,key)
				{
					cb2(null,key);
				});
			
			},
			function(inventoryKey,cb2){
				
				console.log('got here2');
				data.inventoryKey = inventoryKey;
				DB.save(id,data,function(err,doc,key)
				{
					cb2();
				});
			
			},
			function(cb2){
				
				console.log('got here3');
				DB.get('UserIndex',function(err,UserIndex,key)
				{
					cb2(null,UserIndex);
				});
			
			},
			function(UserIndex, cb2)
			{
				console.log('got here4');
					if(!UserIndex)
						UserIndex = [];
					UserIndex.push(id);
					DB.save('UserIndex',UserIndex,function()
					{
						cb2();
					});
			},
			function(cb2)
			{
			
				console.log('got here5');
				global.log(datapath + '\\Profiles\\' + id,0);
				MakeDirIfNotExist(datapath + '\\Profiles\\' + id+'_Data',function(){
						
					cb2();
				});
			}],
			function(err,results)
			{
				console.log('got here6');
				console.log(err,0);
				cb(true);
			}
			);
		}
	});
}
function deleteUser (id,cb)
{
	//get all inventory
	getInventoryForUser(id,function(inventory,idk)
	{
		//remove each inveentory item metadata entry
		if(!inventory) inventory = [];
		async.each(inventory,function(item,cb2)
		{
			DB.remove(item,cb2);
		},
		function(){
			//remove the inventory index
			DB.remove(idk,function(err,doc,key)
			{
				//remove user from user index
				DB.get('UserIndex',function(err,UserIndex,key)
				{
					
					while(UserIndex.indexOf(id) != -1)
						UserIndex.splice(UserIndex.indexOf(id),1);
					
					//save user index
					DB.save('UserIndex',UserIndex,function(err,doc,key)
					{
						//remove user from database
						DB.remove(id,function(err,doc,key)
						{
							//delete user folder
							deleteFolderRecursive(datapath + '\\Profiles\\' + id + '_Data');
							cb();
						});
					});
				});
			});
		});
	});
};
			

function getInstance (id,cb)
{
	DB.get(id,function(err,doc,key){
	
		cb(doc);
	});
}
function updateInstance (id,data,cb)
{
	async.waterfall([
		function(cb2)
		{
			//first, get the existing record
			getInstance(id,function(instance)
			{
				cb2(null,instance);
			});
		},
		function(instance,cb2)
		{
			//if the record does not exist, callback false
			if(instance == null)
			{
				cb2('instance does not exist');
			}else
			{
				cb2(null,instance);
			}
		},
		function(instance,cb2)
		{
			for(var key in data)
			{
				instance[key] = data[key];
			}
			
			DB.save(id,instance,function(err,doc,key)
			{
				cb2(null,doc);
			});
		}],
		function(err, results)
		{
			if(err)
			{
				global.log(err,0);
				cb(false);
			}
				
			cb(true);	
		}
	);	
};

//make a directory if the directory does not exist
function MakeDirIfNotExist(dirname,callback)
{
	fs.exists(dirname, function(e)
	{
		if(e)
		{
			fs.stat(dirname,function(err,stats)
			{
				
				if(stats.isDirectory())
					callback();
				else
				{
					fs.mkdir(dirname,function(){
						callback();
					});
				}
			});
		}else
		{
			fs.mkdir(dirname,function(){
				callback();
			});
		}
	
	});
}
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function SaveFile(filename,data,cb)
{
	fs.writeFile(filename,data,'binary',function()
	{
		cb();
	});
}
function RenameFile(filename,newname,callback,sync)
{
	if(!sync)
		fs.rename(filename,newname,callback);
	else
	{
		fs.renameSync(filename,newname);
		callback();
	}
}
//hash a string
function hash(str)
{
	return require('crypto').createHash('md5').update(str).digest("hex");
}
//no point clogging up the disk with backups if the state does not change.
function CheckHash(filename,data,callback)
{
	fs.readFile(filename, "utf8", function (err, file) {
			
			//global.log("hash is:"+hash(data) +" "+ hash(file));
			if(err || !file)
			{
				callback(false);
				return;
			}
			
			
			if(typeof data == "string")
			{
				
				callback(hash(data) == hash(file));
			}
			else
			{
				var str = JSON.stringify(data)
				var h1 = hash(str);
				var h2 = hash(file)
				callback(h1 == h2);
			}
		});
		return;

}
function saveInstanceState(id,data,cb)
{
	console.log('saveinstancestate');
	var parsedData = typeof data == 'string' ? JSON.parse(data) : data;
	getInstance(id,function(instance){
	
		console.log('get instance callback inside saveinstancestate');
		if(instance)
		{
			global.log('instance '+ id + ' exists');
			async.waterfall([
				function(cb2)
				{
				
					MakeDirIfNotExist(datapath + '\\States\\' + id,function() 
						{
							cb2();
						});
				
				},
				function(cb2)
				{
					CheckHash(datapath + '\\States\\' + id+'\\state',data,function(issame)
					{
						cb2(undefined,issame);
					});
				},
				function(issame,cb2)
				{
					if(!issame)
					{
						RenameFile(datapath + '\\States\\' + id+'\\state',datapath + '\\States\\' + id+'\\statebackup'+GUID(),function()
						{
							cb2(undefined,issame);
						});
					}else
					{
						cb2(undefined,issame);
					}
				},
				function(issame,cb2)
				{
					if(!issame)
					{
						SaveFile(datapath + '\\States\\' + id+'\\state',data,function()
						{
							cb2(undefined);
						});
					}else
					{
						cb2(undefined);
					}
				},
				function(cb2)
				{
					getInstance(id,function(state)
					{
						updateInstance(id,{lastUpdate:(new Date()),updates:1 + state.updates,objects:parsedData.length},function()
						{
							cb2(undefined);
						});
					});
				}
				],function(err,results)
				{
					cb();
				});
		
		}else
		{
			console.log("instance not found");
			cb(false);
		}
	});
}
function createInstance (id,data,cb)
{
	getInstance(id,function(instance){
	
		if(instance)
		{
			global.log('instance '+ id + ' already exists');
			cb(false);
		}
		else
		{
			DB.save(id,data,function(err,doc,key)
			{
				DB.get('StateIndex',function(err,stateIndex,key)
				{
					if(!stateIndex)
						stateIndex = [];
					stateIndex.push(id);
					DB.save('StateIndex',stateIndex,function()
					{
						MakeDirIfNotExist(datapath + '\\States\\' + id,function() 
						{
							cb(true);
						});
					});
				});
			});
		}
	});
};
function deleteInstance (id,cb)
{
	async.series([
	function(cb2)
	{
		DB.remove(id,function(err,doc,key)
		{
			console.log('delete demo folder');
			deleteFolderRecursive(datapath + '\\States\\' + id);
			cb2();
		});
	},
	function(cb2)
	{
		console.log('update state index');
		DB.get('StateIndex',function(err,stateIndex,key)
		{
			
			if(!stateIndex)
			{
				cb();
				return;
			}
			console.log('Got state index');
			stateIndex.splice(stateIndex.indexOf(id),1);
			DB.save('StateIndex',stateIndex,function()
			{
				console.log('Saved StateIndex');
				cb();
			});
		});
	}]);
};
function findState(query,cb)
{
	
	DB.find(query,function(err,res)
	{
		cb(res);
	});

}
function clearUsers()
{
	getUsers(function(UserIndex)
	{
		async.eachSeries(UserIndex,function(item,cb2)
		{
			console.log('delete ' + item);
			deleteUser(item,function()
			{
				cb2();
			});
		},function()
		{
			
		});
	});
}
function importUsers()
{
	fs.readdir(datapath+"\\Profiles\\",function(err,files){
		async.eachSeries(files,
			function(i,cb)
			{
				
				if(!fs.statSync(datapath+"\\Profiles\\"+i).isDirectory())
				{
					getUser(i,function(user)
					{
						if(user)
						{
							console.log("user "+ i + " already in database");
							cb();	
						}else
						{
							var profile = fs.readFileSync(datapath+"\\Profiles\\"+i,"utf8");
							profile = JSON.parse(profile);
							var inventory = profile.inventory;
							delete profile.inventory;
							createUser(i,profile,function()
							{
								async.series([
									function(cb3)
									{
										if(inventory && inventory.objects)
										{
											async.eachSeries(Object.keys(inventory.objects),function(item,cb2)
											{
												console.log("create inventoryitem " + item);
												var itemdata = inventory.objects[item];
												if(itemdata)
												{
													addToInventory(i,{title:item,type:itemdata.type || 'object'},itemdata,function()
													{
														cb2();
													});
												}else
												{
													cb2();
												}
												
												
											},function(res)
											{
												cb3();
											});
										}
										else{
										  cb3();
										}
									},
									function(cb3)
									{
									
										if(inventory && inventory.scripts)
										{
											async.eachSeries(Object.keys(inventory.scripts),function(item,cb2)
											{
												console.log("create inventoryitem " + item);
												var itemdata = inventory.scripts[item];
												if(itemdata)
												{
													addToInventory(i,{title:item,type:itemdata.type},itemdata,cb2);
												}else
												{
													cb2();
												}
												
												
											},function(res)
											{
												cb3();
											});
										}
										else{
										  cb3();
										}
									
									}],function(err,res)
									{
										cb();
									}
								);	
							});
						};
							
					});
						
				}
				else
				{
					cb();
				}
			
				
				
			},
			function(err)
			{
				console.log('done');
			});
	});


}
function importStates()
{
	fs.readdir(datapath+"\\states\\",function(err,files){
		async.each(files,
			function(i,cb)
			{
				console.log(i);
				getInstance(i,function(inst)
				{
					if(inst)
					{
						console.log(i + " already in database");
						cb();
					}
					else
					{
						var instdata = fs.readFileSync(datapath+"\\states\\"+i+"\\state",'utf8');
						instdata = JSON.parse(instdata);
						var statedata = {};
						statedata.objects = instdata.length;
						statedata.owner = instdata[instdata.length -1].owner;
						statedata.title = "Imported State";
						statedata.description = "Imported automatically from database update";
						createInstance(i,statedata,function()
						{
							console.log('imported' + i);
							cb();
						});
					}
				});
				
			},
			function(err)
			{
				console.log('done');
			});
	});
}			
function getUsers (cb)
{
	DB.get('UserIndex',function(err,UserIndex,key)
	{
		cb(UserIndex);
	});
	
};
function purgeInstances()
{
	DB.get('StateIndex',function(err,stateIndex,key)
	{
		var data = {}
		async.each(stateIndex,function(i,cb)
		{
			if(!fs.existsSync(datapath +"\\States\\" + i))
			{
				console.log('delete instance ' + i);
				deleteInstance(i,function()
				{
					cb();
				})
			}else
			{
				cb();
			}
		},function(err)
		{
			
		});
		
	});
}
function getInstanceNamess (cb)
{
	DB.get('StateIndex',function(err,stateIndex,key)
	{
		cb(stateIndex);
	});
};
function getInstances (cb)
{
	DB.get('StateIndex',function(err,stateIndex,key)
	{
		var data = {}
		async.each(stateIndex,function(i,cb)
		{
			getInstance(i,function(inst)
			{
				data[i] = inst;
				cb();
			});
		},function(err)
		{
			cb(data);
		});
		
	});
};
			
function searchUsers (terms,cb)
{

};
function searchInstances (terms,cb)
{

};




function startup(callback)
{
	async.series([
		
		function(cb)
		{
			DB = nStore.new(DBTablePath, function () {
				cb();		
			});
		},
		function(cb)
		{
				DB.get('UserIndex',function(err,UserIndex)
				{
					if(!UserIndex)
						DB.save('UserIndex',[],function(err,data,key)
						{
							cb();
						});
					else
						cb();
				});
		},
		function(cb)
		{
				DB.get('StateIndex',function(err,StateIndex)
				{
					if(!StateIndex)
						DB.save('StateIndex',[],function(err,data,key)
						{
							cb();
						});
					else
						cb();
				});
		},
		function(cb)
		{
			global.log('DAL startup complete',0);
			exports.getUser = getUser;
			exports.updateUser = updateUser;
			exports.createUser = createUser;
			exports.deleteUser = deleteUser;
			
			exports.getInstance = getInstance;
			exports.updateInstance = updateInstance;
			exports.createInstance = createInstance;
			exports.deleteInstance = deleteInstance;
			
			exports.getUsers = getUsers;
			exports.getInstances = getInstances;
			
			exports.searchUsers = searchUsers;
			exports.searchInstances = searchInstances;
			exports.saveInstanceState = saveInstanceState;
			
			exports.importStates = importStates;
			exports.purgeInstances = purgeInstances;
			exports.findState = findState;
			exports.deleteInventoryItem=deleteInventoryItem
			exports.getInventoryForUser = getInventoryForUser;
			exports.addToInventory = addToInventory;
			exports.getInventoryItemMetadata = getInventoryItemMetadata;
			exports.getInventoryItemAssetData = getInventoryItemAssetData;
			exports.getInventoryDisplayData = getInventoryDisplayData;
			exports.updateInventoryItemMetadata = updateInventoryItemMetadata;
			exports.importUsers = importUsers;
			exports.clearUsers = clearUsers;
			exports.compactDatabase = function()
			{
				DB.compactDatabase();
			}
			callback();
		}
	

	]);
	
}

exports.setDataPath = function(p)
{
	global.log("datapath is " + p,0);
	datapath = p;
	DBTablePath = datapath + DBTablePath;
	
	
	
	
}
exports.startup = startup;