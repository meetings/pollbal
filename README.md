
pollbal
=======

Tool to poll service hosts and generate *Perlbal* pool files.

Installation
------------

1. Configure *npm*(1).
```
# npm config set prefix /usr/local --global
```

2. Install dependencies and link *Pollbal* to your $PATH.
```
# npm install
# npm link
```

3. Copy *Upstart* configuration in place.
```
# cp deploy/pollbal.conf /etc/init
# chmod 644 /etc/init/pollbal.conf
```

4. Link or copy *provided_services.conf* to */etc/pollbal.conf*.
```
# cd /etc
# ln -s /path/to/provided_services.conf pollbal.conf
```

5. Start service.
```
# service pollbal start
```
