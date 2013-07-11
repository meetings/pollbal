#!/bin/bash

git checkout master
git clean -f
git reset --hard HEAD
git pull
git tag | xargs git tag -d
git fetch --tags

npm update

install -m 0644 $DEPLOYDIR/$INTENT.conf /etc/init

# Start the service.
#
initctl emit --no-wait theservicestart
