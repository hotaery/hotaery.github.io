---
layout: post
title: 计算机存储层次——SRAM
subtitle: 静态随机访问存储器（SRAM）的原理
tags: [计算机体系结构]
---

# 1 介绍

随机访问存储器（RAM）用于保存计算机运行期的数据，与CPU直接交换数据的内部存储器。

RAM包含两种类型：

- 静态随机访问存储器（SRAM）
- 动态随机访问存储器（DRAM）

相比较DRAM，SRAM有以下特点：

- SRAM每个bit的数据由多个晶体管构成，而DRAM一般每个bit的数据只有一个电容器，因此SRAM成本更高，同时SRAM的速度也更快。
- SRAM在保存1个bit的数据后，只要不断电，数据会一直存在，而DRAM由于电容器会放电，因此需要定时刷新才能确保数据会一直存在。
- SRAM在计算机中一般用于寄存器或者CPU的缓存，而DRAM是作为主存来使用。

本文作为计算机存储层次系列文章的第一篇，着重分析SRAM的读写数据的原理。

# 2 Flip-Flop

我们知道计算机的每个部分都是由基本的门构成的，可以通过两个或非门（NOR）来实现1 bit的数据存储功能

![SR Latch](/assets/memory_hierarchy/SR-latch.png)

这称为SR Latch，其中S表示set，R表示reset，Q是输出，$\bar{Q}$是Q反。

在描述SR Latch原理之前，先看下或非门的真值表，只有A和B全为0时，或非门才会输出1。

|A|B||
|:-:|:-:|:-:|
|0|0|1|
|0|1|0|
|1|0|0|
|1|1|0|

SR Latch的输出如下表，当$R=1$时，由于或非门只要输入存在1就会输出0，因此Q为0，接下来Q和S作为或非门的输入，由于输入全0，因此$\bar{Q}$为1，同理也可以分析$S=1$时的输出。值得注意的是，即使R和S都为0，此时SR Latch会“记住”之前的状态，也就说明SR Latch提供了具有存储1 bit数据的能力。

|time|R|S|Q|$\bar{Q}$|
|:-:|:-:|:-:|:-:|:-:|
|0|0|0|0|0|
|1|1|0|0|1|
|2|0|0|0|1|
|3|0|1|1|0|
|4|0|0|1|0|

使用SR Latch存在的问题是，每次写入都需要输入R和S两个值，因此在SR Latch基础上引入D Latch，逻辑电路如下图，D为输入，EN为使能信号，只有EN被置位时，D Latch存储的值才会改变。

![D Latch](/assets/memory_hierarchy/D-latch.png)

如果将EN使用CLOCK代替，这样的D Latch称为D Flip-Flop，D Flip-Flop输出使用边缘触发来响应，而D Latch使用水平触发来响应。如下图，第一行为时钟的方波信号，第二行为输入的变化，第三行是水平触发的的输出，也就是Q的变化，第四行是使用边缘触发时Q的变化。水平触发表示当时钟处于高电平时，输出会随着输入的变化而变化，而边缘触发只有当时钟从低电平到高电平变化时输出响应输入。相比较水平触发，边缘触发更稳定，在一个时钟周期内输出只会响应一次，因此使用D Flip-Flop来构建RAM。

![](/assets/memory_hierarchy/D-Flip-Flop.png)

# 3 寄存器

我们已经知道如何使用最基本的门来构建存储1 bit的数字电路，接下来就可以构建能够容纳更多容量的存储器。存储器提供存取的功能，而D Flip-Flop存储的值会随着输入的变化而变化，因此需要解决如何读取D Flip-Flop的值，可以通过选择器来解决该问题。选择器有两个数据输入$a$和$b$，以及控制信号$sel$，当$sel$为0，输出$a$，而当$sel$为1时输出$b$。

通过选择器和D Flip-Flop来构建可以存储1 bit的存储器，如下图，这个1 bit的存储器有一个数据输入$\mathrm{in}$和一个控制信号$\mathrm{load}$。$\mathrm{load}$为1时会将数据$\mathrm{in}$写入D Flip-Flop中，如果$\mathrm{load}$为0时，会读取D Flip-Flop中存储的值。

![bit](/assets/memory_hierarchy/bit.png)

SRAM每次存取都按照字长来读写的，也就是每次存取都会涉及到$n$个bit，$n$一般是8、16、32或者64，这种能够存储一个字（word）的存储器称为寄存器。寄存器包含$n$个前文描述的可以存储1个bit的存储器，需要注意的是，$\mathrm{load}$信号会和寄存器中所有的选择器连接。

# 4 SRAM
SRAM是有$n$个寄存器构成，其输入包含地址、数据以及控制信号。当SRAM收到存取的命令时，其会将命令发送给所有寄存器，接下来每个寄存器判断地址是否和本身地址一致来决定下一步操作，因此SRAM的访问时间和访问位置无关。下面通过一个例子详细描述SRAM如何存取数据的。

假设字长为16 bit，那么一个大小为32 kb的SRAM总共包含16k个寄存器，也就是地址长度为14 bit，再假设其包含四个较小的包含4k个寄存器的SRAM。那么可以根据地址最高位和此高位判断出地址属于哪个小的SRAM，这可以通过四路选择器完成。一个四路选择器（DMux4Way）有一个输入$\mathrm{in}$和一个控制信号$\mathrm{sel}$，输出为四个值，其中只有一个和$\mathrm{in}$相等，其余三个全是0。

|$\mathrm{in}$|$\mathrm{sel}$|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|
|:-:|:-:|:-:|:-:|:-:|:-:|
|$\mathrm{x}$|00|$\mathrm{x}$|0|0|0|
|$\mathrm{x}$|01|0|$\mathrm{x}$|0|0|
|$\mathrm{x}$|10|0|0|$\mathrm{x}$|0|
|$\mathrm{x}$|11|0|0|0|$\mathrm{x}$|

通过四路选择器可以将$\mathrm{load}$控制信号正确的输送给某个小的SRAM，最后一步就是如何正确地选择四个输出中的一个，也是通过一个四路选择器（Mux4Way）,这个四路选择器和DMux4Way不一样的地方是其接受四个输入和一个控制信号$\mathrm{sel}$，根据$\mathrm{sel}$从四个输入选择一个值作为输出$\mathrm{out}$。

|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|$\mathrm{sel}$|$\mathrm{out}$|
|:-:|:-:|:-:|:-:|:-:|:-:|
|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|00|$\mathrm{a}$|
|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|01|$\mathrm{b}$|
|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|10|$\mathrm{c}$|
|$\mathrm{a}$|$\mathrm{b}$|$\mathrm{c}$|$\mathrm{d}$|11|$\mathrm{d}$|

对于包含4 k个寄存器的SRAM，其地址长度为12，也可以使用同样的思想继续拆成更小的粒度，比如如果支持八路选择器，就可以使用三位地址来选择。