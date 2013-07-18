#!/bin/bash

npm config set prefix $PREFIX --global
npm install
npm link

install -m 0644 $DEPLOYDIR/$INTENT.conf /etc/init

ln -sf /usr/local/mbin/portforward/conf/provided_services.config /etc/pollbal.conf

initctl emit --no-wait theservicestart
