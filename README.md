#TBA-Tracker

## Overview
TBA-Tracker is a script written in Javascript/HTML/CSS, for the purpose of tracking TBA Milestone completion progress. 

## Security Concerns
TBA-Tracker executes Javascript from within a Hyper Text Application (HTA). 

>
#### HTAs

>HTAs are given the same rights as an installed self-executable. Windows controls the rights for the user currently logged in and extends those rights to the HTA. Essentially, what the user logged in is able to do to the local system, is what the HTA can do, no more. 

HTAs use Internet Explorer to display HTML/CSS and interpret Javascript. The difference between the two is HTAs remove a layer of security that Internet Explorer imposes. Specifically, access to the local file system. TBA-Tracker needs this access to save the data that is scraped from TBA, reducing the amount of required calls to TBA servers. While HTAs remove a security layer, TBA-Tracker does not evaluate external code. This effectively does not increase the risk to security, given that proper coding practices are observed.
