#!/bin/bash

git clean -f
git reset --hard HEAD
git checkout master
git pull

npm update

install -m 0644 $DEPLOYDIR/$INTENT.conf /etc/init

initctl emit --no-wait theservicestart
