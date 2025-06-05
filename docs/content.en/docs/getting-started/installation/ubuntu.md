---
weight: 10
title: "Ubuntu"
asciinema: true
---

# Ubuntu

> NOTE: Coco app only works fully under [X11][x11_protocol].
>
> Don't know if you running X11 or not? take a look at this [question][if_x11]!

[x11_protocol]: https://en.wikipedia.org/wiki/X_Window_System 
[if_x11]: https://unix.stackexchange.com/q/202891/498440


## Go to the download page

Download page: [link](https://coco.rs/#install)

## Download the package

Download the package of your architecture, it should be put in your `Downloads` directory 
and look like this:

```sh
$ cd ~/Downloads
$ ls 
Coco-AI-x.y.z-bbbb-deb-linux-amd64.zip 
# or Coco-AI-x.y.z-bbbb-deb-linux-arm64.zip depending on your architecture
```

## Install it
   
Unzip and install it

```
$ unzip Coco-AI-x.y.z-bbbb-deb-linux-amd64.zip 
$ sudo dpkg -i Coco-AI-x.y.z-bbbb-deb-linux-amd64.deb 
```
