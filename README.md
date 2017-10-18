## InfluxDB admin

This panel duplicates the simple features avaliable in the [Web Admin Interface](https://docs.influxdata.com/influxdb/v1.2/tools/web_admin/).  That UI is now deprecated and disabled by default.

This panel lets you pick see the currently running queries and easily kill them.

This plugin expects there to be at least one InfluxDB datasource configured.


### Screenshots

![Current Queries](https://raw.githubusercontent.com/NatelEnergy/grafana-influx-admin/master/src/img/screenshot-current.png)
![Kill Queries](https://raw.githubusercontent.com/NatelEnergy/grafana-influx-admin/master/src/img/screenshot-kill.png)
![Query Window](https://raw.githubusercontent.com/NatelEnergy/grafana-influx-admin/master/src/img/screenshot-query.png)
![Options](https://raw.githubusercontent.com/NatelEnergy/grafana-influx-admin/master/src/img/screenshot-options.png)
![Write Data](https://raw.githubusercontent.com/NatelEnergy/grafana-influx-admin/master/src/img/screenshot-write.png)


### Building

To complie, run:
```
yarn install
grunt
```


#### Changelog

##### v0.0.3 (not released yet)

- Converted to typescript project based on [typescript-template-datasource](https://github.com/grafana/typescript-template-datasource)
- Select Databases.  Note this requires Grafana 4.6+ to work
- Added time format options
- [WIP] Keep query history
- Show tags from response
- Support template variables in the query


##### v0.0.2

- Save the configuration properly


##### v0.0.1

- First working version

