var { SerialPort }=require('serialport');
var { ReadlineParser }=require('@serialport/parser-readline');
/*
Author: Pallob Kumar Gain
*/

class serialDeviceHandel{
    serial;
    connected_serial;
    closeCallback=[];
    errorCallback=[];
    connectCallback=[];
    dataCallback=[];
    receiving=true;
    delimiter;
    lineParser;
    waitListenerCallbacks=[];
    queue_tasks=[];
    queue_busy=false;

    constructor(delimiter='\r\n'){
        this.delimiter=delimiter;
    }

    open(port, baud,timeout=3000){
        return new Promise((resolve, reject)=>{

            this.serial=new SerialPort({path:port,baudRate: baud}, (err)=>{
                if(err){
                    clearTimeout(serial_open_monitor);
                    reject(err);
                }
            });

            var serial_open_monitor=setTimeout(()=>{
                this.serial.close();
                reject('Serial Connect Timeout');
            },timeout);

            if(this.serial==null)return reject('Serial port not responding!');

            this.serial.on('open',()=>{
                clearTimeout(serial_open_monitor);
                this.connected_serial=this.serial;
                
                for(var callback of this.connectCallback){
                    callback(this.serial);
                }
               
                //console.log({ delimiter:this.delimiter });

                this.lineParser = this.serial.pipe(new ReadlineParser({ delimiter:this.delimiter }));

                this.lineParser.on('data', (line) =>{
                    
                    if(this.waitListenerCallbacks.length>0){
                        let currentCallback=this.waitListenerCallbacks.shift();
                        currentCallback(line);
                    }
                    else if(this.receiving){
                        for(var callback of this.dataCallback){
                            callback(line);
                        }
                    }

                });

                this.receiving=true;
                this.queue_busy=false;

                resolve(this.serial);
            });

            //serial.on('data',updateBuffer);

            this.serial.on('close',(...args)=>{
                
                this.connected_serial=null;

                for(var callback of this.closeCallback){
                    callback(...args);
                }
            });

            
            this.serial.on('error',(...args)=>{
                for(var callback of this.errorCallback){
                    callback(...args);
                }
            });

        });
    }

    async getList(){
        return await SerialPort.list();
    }
    
    isConnected(){
        return this.connected_serial!=null?this.serial.isOpen:false;
    }

    close(){
        if(this.serial){
            this.connected_serial=null;

            if(this.lineParser)this.lineParser.destroy();
            this.receiving=false;
            this.waitListenerCallbacks.splice(0,this.waitListenerCallbacks.length);

            this.clearQueueTasks();

            this.serial.close();
        }
    }

    receiverPause(){
        //if(this.lineParser)this.lineParser.pause();
        this.receiving=false;
    }

    receiverResume(){
        //if(this.lineParser)this.lineParser.resume();
        this.receiving=true;
    }

    onClose(callback){
        this.closeCallback.push(callback);
    }

    onError(callback){
        this.errorCallback.push(callback);
    }

    onConnect(callback){
        this.connectCallback.push(callback);
    }

    onReceive(callback){
        this.dataCallback.push(callback);
    }

    clear(){
        return new Promise((resolve,reject)=>{
            this.serial.flush((err)=>{
                if (err){
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    clearWaiterCallback(callback_index){
        this.waitListenerCallbacks.splice(callback_index,1);
    }

    setWaiterCallback(callback){
        let current_index=this.waitListenerCallbacks.length;
        this.waitListenerCallbacks.push(callback);
        return current_index;
    }

    clearQueueTasks(){
        for(let {waiter_task:{reject}}  of this.queue_tasks){
            reject('Serial port closing');
        }
        this.queue_tasks.splice(0,this.queue_tasks.length);
        this.queue_busy=false;
    }

    async kickQueueTasks(){
        if(this.queue_busy)return;
        this.queue_busy=true;

        while(this.queue_tasks.length>0){
            let current_task=this.queue_tasks.shift();
            let {write_task,waiter_task:{resolve, reject}}=current_task;

            try{
                resolve(await new Promise(write_task));
            }
            catch(err){
                reject(err);
            }
        }

        this.queue_busy=false;
    }

    setWriteQueue(write_task){
        return new Promise((resolve, reject)=>{
            
            this.queue_tasks.push({
                write_task,
                waiter_task:{resolve, reject}
            });

            this.kickQueueTasks();
        });
    }

    write(data,options={}){
        if(!('delimiter' in options))options.delimiter='\r\n';

        let write_task=(data,options,resolve, reject)=>{
            if('receive' in options && options.receive){

                let timeout=setTimeout(()=>{

                    if(waiter_callback)this.clearWaiterCallback(waiter_callback); //if timeout happen clear the callback

                    reject('Serial does not make any response');
                },'timeout' in options?options.timeout:1000);
                

                let waiter_callback=this.setWaiterCallback(line=>{
                    
                    clearInterval(timeout);
                    resolve(line);

                });
            }
            
            this.serial.write(data,(err)=>{
                
                if (err){
                    return reject(err);
                }

                this.serial.drain((err)=> {
                    if (err) {
                        return reject(err);
                    }
                    else if(!('receive' in options && options.receive)) return resolve(true);
                });
    
            }); 
        };

        return this.setWriteQueue(write_task.bind(this,data,options));
    }

    print(data,options={}){
        return this.write(data.toString(),options);
    }

    println(data,options={}){
        return this.write(data.toString()+"\r\n",options);
    }

    set(options,callback){
        if(this.serial){
            return new Promise((resolve,reject)=>{
                var timeChecker=setTimeout(()=>{
                    reject('Serial setting timeout');
                },2000);

                this.serial.set(options,()=>{
                    clearTimeout(timeChecker);
                    if(callback)callback();
                    resolve(true);
                });
            });
        }
    }
    
}


module.exports = {serialDeviceHandel};