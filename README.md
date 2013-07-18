
# pollbal

Tool to poll service hosts and generate pool files for *Perlbal*.

## Configuration

Pollbal expects to find its main configuration in */etc/pollbal.json*. See
*example.json* for a template.

### Options rundown

    pool_directory         - Base directory i.e. the place where pool files are written.
    services_file          - List of services. See below.
    poll_interval          - Time to wait between sending poll requests.
    service_timeout        - Time to wait for the service to respond. If service does not
                             respond quick enough, it is considered failed.
    remote_config_url      - An address from where a new configuration is fetched. This can
                             be used to update the configuration, but must be used with care
                             since local configuration is overwritten.
    remote_config_interval - An interval for checking remote configuration for updates.

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

### Services

Configuration option *services\_file* defines a path to a file which holds the services
to be polled. Each service must have an address and a port separated which space. Services
are separated with newline. Comments and empty lines are ignored.
```
# This is an example of two services
10.0.0.1  80
10.0.0.2  80
```
