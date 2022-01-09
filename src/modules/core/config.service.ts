import path from 'path'
import _get from 'dlv'
import mergeOptions from 'merge-options'
import {Key} from 'interface-datastore'
import {FsDatastore} from 'datastore-fs'
import fs from 'fs'

function obj_set(obj, props, value) {
    if (typeof props == 'string') {
        props = props.split('.');
    }
    if (typeof props == 'symbol') {
        props = [props];
    }
    var lastProp = props.pop();
    if (!lastProp) {
        return false;
    }
    var thisProp;
    while ((thisProp = props.shift())) {
        if (typeof obj[thisProp] == 'undefined') {
            obj[thisProp] = {};
        }
        obj = obj[thisProp];
        if (!obj || typeof obj != 'object') {
            return false;
        }
    }
    obj[lastProp] = value;
    return true;
}
class ChildConfig {
    rootKey: any;
    parentConfig: any;
    constructor(parentConfig, rootKey) {
        this.parentConfig = parentConfig;
        this.rootKey = rootKey;
    }
    /**
     * 
     * @param {String} key 
     */
    get(key) {
        return this.parentConfig.get(`${this.rootKey}.${key}`);
    }
    /**
     * 
     * @param {String} key 
     * @param {*} value 
     */
    set(key, value) {
        return this.parentConfig.set(`${this.rootKey}.${key}`, value);
    }
}
export class Config {
    config: any;
    datastore: any
    modules: {}
    obj_set: (obj: any, props: any, value: any) => boolean
    path: string
    constructor(datastore) {
        if(typeof datastore === "string") {
            this.datastore = new FsDatastore(datastore, {
                extension: ''
            })
        } else {
            this.datastore = datastore;
        }

        this.modules = {};
        this.obj_set = obj_set;
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
    }
    reload() {
        var buf = fs.readFileSync(this.path).toString();
        var obj = JSON.parse(buf);
        //patch
        this.config = mergeOptions(this.config, obj)
    }
    save() {
        var buf = Buffer.from(JSON.stringify(this.config, null, 2));
        this.datastore.put(new Key("config"), buf)
    }
    /**
     * 
     * @param {String} key 
     */
    get(key) {
        if (typeof key === 'undefined') {
            return this.config;
        }
        if (typeof key !== 'string') {
            return new Error('Key ' + key + ' must be a string.');
        }
        return _get(this.config, key);
    }
    /**
     * 
     * @param {String} key 
     * @param {*} value 
     */
    set(key, value) {
        obj_set(this.config, key, value);
        this.save();
    }
    async open() {
        if (!(await this.datastore.has(new Key("config")))) {
            this.init();
            return;
        }
        var buf = await this.datastore.get(new Key("config"));
        this.config = JSON.parse(buf.toString());
    }
    child(key) {
        return new ChildConfig(this, key)
    }
    /**
     * Creates config with default settings
     * @param {Object} config custom config object
     */
    async init(config?) {
        const defaultConfig = {
            cryptoAccounts: {
                hive: null
            },
            cluster: {
                //masters: [], //List of gateway API endpoints to follow. Currently not supporting multiple gateways
                master_gateway: ''
            },
            node: {
                name: 'A SPK network encoding node',
                privateKey: null //Initialized on start
            },
            ipfs: {
                apiAddr: "/ip4/127.0.0.1/tcp/5001",
                internalDaemon: false
            },
            gateway: {
                enabled: false,
                mongodb_url: '', //If conenction fails, the gateway will not run
                ipfsCluster: {
                    url: '',
                    credentials: ''
                },
            },
            /*api: {
                http: {
                    enabled: true,
                    apiAddr: "/ip4/127.0.0.1/tcp/8001"
                }
            },*/
            admin: {
                //List of admin DIDs
                controllers: []
            }
        };


        this.config = config || defaultConfig;
        this.save()
    }
}