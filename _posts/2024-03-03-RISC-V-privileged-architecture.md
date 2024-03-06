---
layout: post
title: RISC-V指令集的特权架构
subtitle: RISC-V
tags: [计算机体系结构, 6.828]
---

最近学习[mit 6.828](https://pdos.csail.mit.edu/6.828/2023/schedule.html)这门公开课，这门课包含一个基于RISC-V架构的[操作系统](https://github.com/mit-pdos/xv6-riscv)。在学习过程中，看了非常多的RISC-V架构的文档，在此记录一下供后续查看。

# 1 特权架构

RISC-V架构提供了三种模式
- Machine mode(M-mode)
- Supervisor mode(S-mode)
- User mode(U-mode)

这三种模式，M-mode拥有对系统和硬件完全掌控的权限，U-mode权限最低，只能够使用一般意义的指令或者寄存器，没有权限访问硬件设备。

在现代计算机体系结构中，RAM抽象为一个包含非常多能够存储一个字节的存储单元（cell）的设备，每个存储单元都有一个从零开始的地址，处理器通过地址来读写RAM。对于外部I\O设备，将这些设备映射为某个地址或者某个地址段，那么处理器也能够使用简单的load\store指令来访问设备。对于xv6操作系统，QEMU将`[0x0, 0x80000000)`保留作为I\O设备映射的地址空间，如下图右图所示。

![源自https://pdos.csail.mit.edu/6.828/2023/xv6/book-riscv-rev3.pdf](/assets/operating_system/physical_memory_space.png)

在M-mode中，通过物理地址（physical address，PA）来访问RAM或者I\O设备，处理中断或者异常。S-mode下使用虚拟地址（virtual address，VA）访问RAM或者I\O设备，通过地址翻译单元（MMU）将虚拟地址翻译成物理地址才能够访问RAM或者I\O设备，并且默认不能处理中断或者异常。U-mode权限最低，需要通过中断陷入S-mode才能够访问I\O设备。

# 2 中断和异常
中断和异常都会导致处理器的执行流跳转到中断异常处理程序（exception handler），默认情况下中断异常处理程序是在M-mode下执行的。

M-mode下有几个额外的寄存器来描述和中断或者异常相关的状态，这些寄存器只能在M-mode下才能读写。

|寄存器|描述|
|:-:|:-|
|mtvec|中断异常处理程序入口|
|mepc|中断或者异常发生时PC寄存器的值|
|mcause|使用bit位来表示哪种中断或者异常|
|mie|哪些中断需要处理|
|mip|哪些异常等待处理|
|mtval|保留额外的信息，比如访问地址异常时会保存访问的地址|
|msratch|临时存储，会在中断异常处理程序中用于保存当前寄存器以供执行完毕后恢复上下文再次回到中断处的执行流|
|mstatus|控制是否需要开启中、保存进入中断异常处理程序之前的一些状态信息|

![图源自https://www.cs.sfu.ca/~ashriram/Courses/CS295/assets/books/rvbook.pdf](/assets/operating_system/mstatus.png)

上图是mstatus包含的状态，比较关心的包括

|字段|描述|
|:-:|:-|
|MIE|是否开启中断处理|
|MPIE|进入中断异常处理程序之前的MIE值|
|MPP|进入中断异常处理程序之前的模式|

当中断或者异常发生时，硬件会执行以下四步后跳转到mtvec处

1. 将PC寄存器保存到mepc中，并且将PC设置为mtvec
2. 设置mcause为发生的异常或者中断，并且设置额外需要的信息到mtval中
3. 将mstatus.MIE保存到mstatus.MPIE，并设置mstatus.MIE为0
4. 将mstatus.MPP设置为中断或者异常发生时的模式

在中断异常处理程序中，会首先将一些整数寄存器的值保存到mscratch指向到存储空间，接着再处理中断和异常，最后将保存在mscratch保存的寄存器值恢复到寄存器中，将PC设置为mepc，从而恢复之前的执行流。

为了让类Unix的多任务操作系统能够运行在RISC-V架构，RISC-V架构提供了S-mode。S-mode通过虚拟地址来访问硬件资源，这样内核和每个进程都有自己的地址空间，提供了资源隔离的效果。默认所有中断或者异常都是转到M-mode下处理的，RISC-V提供额外的机制可以将中断或者异常授予给S-mode处理，这涉及到额外的两个寄存器mideleg（Machine interrupt delegation）和medeleg（Machine exception delegation），分别用于授予中断和异常。同时S-mode也有和M-mode一样的状态控制寄存器，前文已经描述过M-mode的8个状态控制寄存器，S-mode也存在8个状态控制寄存器，和M-mode的区别是这些寄存器全是以S***开头，这里不再赘述。

# 3 物理内存保护

物理内存保护（Physical Memory Protection，PMP）是一种很低级别的资源隔离手段，一般用于嵌入式设备，PMP涉及到两种类型寄存器pmpaddr*和pmpcfg*。pmpaddr是物理地址，pmpcfg是地址空间的配置信息，其中pmpaddr0描述`[0, pmpaddr0)`地址空间，其访问权限的配置信息在`pmpcfg0`的低8位。需要注意的是，S-mode通过地址访问I\O设备或者RAM时会受到PMP的限制，而M-mode不会。

# 4 虚拟地址
虚拟地址是一个比较大的主题，本节只是为了本文的完整性很笼统的介绍下虚拟地址，后面会另外写一篇文章更详细地描述虚拟地址。

S-mode和U-mode是通过虚拟地址来访问I\O设备或者RAM的，这是通过设置页表寄存器satp实现的，通过将satp寄存器设置为根页表的地址，接下里处理器会将虚拟地址发送给地址翻译单元，地址翻译单元从页表中找到对应的页表条目（PTE），PTE包含物理页的首地址（PPN），处理器将PPN和虚拟地址的地址偏移（VPO）结合就形成物理地址，那么接下来就可以通过物理地址来访问RAM或者I\O设备了。
