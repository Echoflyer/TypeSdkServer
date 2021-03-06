/**
 * Created by TypeSDK 2016/10/10.
 */
var Sync = require('./sync');
var gameIdKey = 'GameId';
var channelIdKey = 'ChannelId';
var userKey = 'User';
var eventKey ='Event';
function createOrUpdateOrder(query,ret,retf){
    var data = query.data;
    var eventArray = [];
    var eventObject = {};
    var multi = Redis.multi();

    for(var i=0;i<data.length;i++){
        for(var j in data[i]){
            eventArray.push(j);
            eventObject[i]= data[i][j];//还要确认data[i][j]的值数据类型
        }
    }

    var indx = 0;

    var functions = {
        'multiSaddOrder':function(next){
            multi.sadd(gameIdKey,query.gameID);//saddGameId
            multi.sadd(channelIdKey,query.channelId);//saddChannelId
            multi.sadd(userKey+':'+query.gameID,query.userId);//saddUserId
            next('multiEventOrder');
            return;
        },
        'multiEventOrder':function(next){
            if(indx<eventArray){
                multi.sadd(eventKey+':'+query.gameID,eventArray[indx]);//saddEvent_gameId
                multi.incrby(query.gameID+':'+eventArray[indx],eventObject[eventArray[indx]]);//incrbyGameId_event
                multi.incrby(query.gameID+':'+query.channelId+':'+eventArray[indx],eventObject[eventArray[indx]]);//incrbyGameId_channelId_event
                multi.incrby(query.gameID+':'+query.userId+':'+eventArray[indx],eventObject[eventArray[indx]]);//incrbyGameId_userId_event
                multi.incrby(query.gameID+':'+query.channelId+':'+query.userId+':'+eventArray[indx],eventObject[eventArray[indx]]);//incrybyGameId_channelId_userId_event
                indx++;
                next(multiEventOrder);
            }else{
                multi.exec(function (err, replies) {
                    if(err){
                        ret.code = -1 ;
                        ret.msg = 'err';
                    }else{
                        ret.code = 0 ;
                        ret.msg = 'NORMAL';
                        ret.data = replies;
                    }
                    retf(ret);
                    return;
                });
            }
        }
    };
    var sync = new Sync(functions);
    sync.runbyMap('multiSaddOrder');
}
function getItemList(Redis,gameId,channelId,ret,cb){
    console.log('GAME:'+gameId+':CHANNEL');
    console.log('ch'+channelId);
    Redis.hget('GAME:'+gameId+':CHANNEL','ch'+channelId,function(err, obj){
        if (err) {
            ret.code = -1;
            ret.msg = 'REDIS ERROR';
        } else {
            if (obj) {
                ret.code = 0;
                ret.msg = 'CP EXISTS';
                var data = JSON.parse(obj);
                ret.itemList = {};

                if(data.attrs&&data.attrs.itemLists){
                    var itemList  = data.attrs.itemLists;
                    itemList.forEach(function(obj){
                        console.log(obj['itemcpid']);
                        console.log(obj['itemid']);
                        ret.itemList[obj['itemcpid']] = obj['itemid'];
                    });
                }
            }
        }
        cb(ret);
    });
}
exports.createOrUpdateOrder = createOrUpdateOrder;
exports.getItemList = getItemList;
