## InfluxDB admin

This panel duplicates features from the now depricated [Web Admin Interface](https://docs.influxdata.com/influxdb/v1.2/tools/web_admin/).

This panel lets you see the currently running queries and easily kill them.

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
npm install -g yarn
yarn install --pure-lockfile
grunt
```

#### Changelog

##### v0.0.5

* Now supports $timeFilter in query
* Now supports datasource defined as a template variable
* Added more debug query templates
* Fix write request bug
* Support Grafana 5+

##### v0.0.4

* Fix issue always showing query results
* When there is only one row, swap rows/cols (ie: SHOW DIAGNOSTICS)
* Improve auto-refresh behavior.
* Show 'message' response. (ie: please use POST)
* Fix query time sorting
* show 'status' field (killed, etc)

##### v0.0.3

* Converted to typescript project based on [typescript-template-datasource](https://github.com/grafana/typescript-template-datasource)
* Select Databases. This only works with [PR#8096](https://github.com/grafana/grafana/pull/8096)
* Added time format options
* Show tags from response
* Support template variables in the query

##### v0.0.2

* Save the configuration properly

##### v0.0.1

* First working version
