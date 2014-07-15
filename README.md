
# pollbal

Tool to poll service hosts and generate pool files for *Perlbal*. The idea should be easily extendable to any HTTP load balancer which can modify their pool contents gracefully.

## Example usage on load balancer nodes

Define the IP and PORT for all nodes that acts as HTTP pool members:

    # /etc/pollbal.services
    10.0.0.1 80 # api-node-1
    10.0.0.2 80 # api-node-2
    10.0.0.3 80 # website-node-1
    10.0.0.4 80 # website-node-2

Start the service on an Ubuntu system

    ~ # service pollbal start
    
This should start sending HTTP "GET /pool" -requests to all of the listed services periodically. The requests might return for example the following:

    api-node-1      --> api serving ce0a2b02e2d6fb3d03327cf53fd4393f908ef8bd
    api-node-2      --> api serving 898f7f2404f12907a4e0d22fdfd5dbab144c787b
    website-node-1  --> website
    website-node-2  --> website leaving

This causes the nodes to get assigned to one or more .pool files:

    ~ # cat /run/pool/api.pool
    10.0.0.1 80 # api-node-1
    10.0.0.2 80 # api-node-2


    ~ # cat /run/pool/api.ce0a2b02e2d6fb3d03327cf53fd4393f908ef8bd.pool
    10.0.0.1 80 # api-node-1


    ~ # cat /run/pool/api.898f7f2404f12907a4e0d22fdfd5dbab144c787b.pool
    10.0.0.2 80 # api-node-2


    ~ # cat /run/pool/website.pool
    10.0.0.3 80 # website-node-1


    ~ # cat /run/pool/disabled_services
    10.0.0.4 80 # website-node-2

## Example usage on HTTP pool member nodes 

Normal behaviour on a normal static web server that belongs to pool "website":

    ~ # echo 'website' > /var/www/pool

Normal behaviour on a node.js express project that belongs to pool "api" and serves version "1":

    app.get('/pool', function( req, res, next ) {
        res.send( "api serving 1" );
    }

If a website node is going down for an update soon, do this on the node:

    ~ # echo 'website leaving' > /var/www/pool

## More detailed requirements for the HTTP pool members

All pollbal HTTP service pool members **NEED** to provide the following HTTP endpoint:

    GET /pool

This endpoint can be just a static file or a simple script which outputs a single line which might look like the following:

    api serving 898f7f2404f12907a4e0d22fdfd5dbab144c787b

This would indicate that this HTTP pool member belongs to the pool named "*api*", it is currently operating normally ("*serving*") and that the version it is serving is called "*898f7f2404f12907a4e0d22fdfd5dbab144c787b*".

The pool name and the version string can be any alphanumeric string, so for illustration puposes we now rename the "*api*" pool as "*frontpageservice*" and the version to "*v23*":

    frontpageservice serving v23

When one of the nodes in the "*frontpageservice*" pool is due to get updated to version "*v24*", the content of the "/pool" file should be changed to the following:

    frontpageservice leaving v23
    
This would indicate that this HTTP pool member is still serving version "*v23*" of the service but is soon about to go out of service. The pollbal servers should react normal situations just drop the node from it's list of active pool members very soon. It would however be wise to account for some polling and pool management delays and for example sleep for 15 seconds after changing the "status" of the service from "serving" to "leaving" until actually taking the node out of service.

When the service is taken down, the content of the "/pool" file should be cleared. This indicates the pollbal servers that this node does not currently serve anything.

Once the update to verison "*v24*" is done and the service is properly up and running, the contents of the file should be changed to the following:

    frontpageservice serving v24
    
This should indicate the pollbal servers that if someone is interested in getting the version "*v24*" of the service, the requests can be routed to this node.

The general form of the "/pool" endpoint is the following:

    pool [ status [ version ] ]
    
The default for a missing status would be "serving" and the default for the missing version would just be an empty string. This means that if it is not a problem for you that multiple different versions of your service are serving simultaneously, your "/pool" file can be as simple as this:

    frontpageservice

.. and if you want to take the service down for an update, you just change it temporarily to this:

    frontpageservice leaving

## Configuration

Pollbal expects to find its main configuration in */etc/pollbal.json*. See
*example.json* for a template.

### Options rundown

    pool_directory         - Base directory i.e. the place where pool files are written.
    services_file          - List of services. See below.
    poll_interval          - Time to wait between sending poll requests.
    service_timeout        - Time to wait for the service to respond. If service does not
                             respond quick enough, it is considered failed.

Following options define external commands to be executed at predefined events.
Valid values must be JSON arrays, in where first element is the command and the
subsequent elements are optional parameters. All commands are executed asynchronously
and therefore the precise state of pollbal or pool files cannot be guaranteed.

    post_init_hook         - Executed at pollbal's startup. Following two environmenta
                             variables are passed to the external command:
                             POLLBAL_POOL_DIRECTORY POLLBAL_SERVICES_FILE
    pre_quit_hook          - Executed when pollbal is quitting.
    file_update_hook       - Executed when a write operation is about to take place to
                             previously existing or nonexisting file. Following variables
                             are passed:
                             POLLBAL_POOL_DIRECTORY POLLBAL_FILE_NAME
    file_remove_hook       - Executed when a pool file is being deleted. Following variables
                             are passed:
                             POLLBAL_POOL_DIRECTORY POLLBAL_FILE_NAME

