# Imprompt.io

![](http://imprompt.io/images/hero.jpg)

## Success requires grit. Meetings shouldn't.

### Challenge

While many tools exists to facilitate planned meetings, remote workers get left out of ad hoc or impromptu meetings.

These informal meetings often generate important decisions, yet lack input from relevant teammates. Business intelligence from these unplanned meetings is also less likely to be captured.

There is too much friction involved in including remote colleagues in impromptu meetings. The benefit of such meetings is that they happen quickly and spontaneously. By the time it is determined if a remote team mate is available, and a method of communication is established, the meeting could be over.

Additionally, even the minor interruption created by asking a developer if she is available can take her out of the “zone”.

### Solution

Utilizing strategically placed Amazon Echoes, meeting organizers use natural language to seamlessly query multiple cloud-based services which determine the availability of remote team members and initiate a teleconference using video chat or even a good old fashioned phone call. Possible participants indicate their availability and are notified of meeting requests via a UI they are already using all day long: Slack. Moreover, meetings are recorded and transcribed into notes pushed back into the appropriate Slack channel.

### Design

![](http://imprompt.io/images/design.png)

## Alexa Sample Utterances

* `WhatsTheAvailability This is {NameOne} are {NameTwo} and {NameThree} available`
* `WhatsTheAvailability it's {NameOne} are {NameTwo} and {NameThree} available`
* `WhatsTheAvailability it is {NameOne} are {NameTwo} and {NameThree} available`
* `WhatsTheAvailability {NameOne} speaking are {NameTwo} and {NameThree} available`
* `WhatsTheAvailability {NameOne} here are {NameTwo} and {NameThree} available`
* `EndCall we're done`
* `EndCall we are done`
* `DontBother No don't bother`
* `DontBother No do not bother`
* `DontBother don't bother`
* `DontBother do not bother`
